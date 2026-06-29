import type { MemoryStore } from './store.js';
import type { RecallResult } from '../types/memory.js';
import type { MemoryRecallConfig } from '../config/schema.js';

/** 嵌入向量生成器接口（由 LLM 层注入实现） */
export interface Embedder {
  embed(texts: string[]): Promise<number[][]>;
}

export const DEFAULT_RECALL_OPTIONS: Required<MemoryRecallConfig> = {
  maxDepth: 3,
  maxNodes: 30,
  anchorCount: 5,
  minScore: 0.1,
  hopDecay: 0.6,
};

/**
 * 渐进式记忆召回 — 模拟人类联想记忆
 *
 * 流程：
 * 1. 语义检索锚点（向量相似度 top-K）
 * 2. 带权 BFS 沿关联边逐跳展开
 * 3. 评分：anchorScore × hopDecay^depth × importance × decayScore
 * 4. 剪枝（低于 minScore）+ 截断（超过 maxNodes）
 * 5. 排序返回，同时异步强化被召回的记忆
 *
 * @param query 当前查询文本
 * @param store 记忆存储
 * @param embedder 嵌入向量生成器
 * @param options 召回参数
 */
export async function progressiveRecall(
  query: string,
  store: MemoryStore,
  embedder: Embedder,
  options?: Partial<MemoryRecallConfig>
): Promise<RecallResult> {
  const opts = { ...DEFAULT_RECALL_OPTIONS, ...options };

  // 1. 生成查询向量
  const [queryEmbedding] = await embedder.embed([query]);

  // 2. 锚点定位（向量检索 top-K）
  const anchors = await store.vectorSearch(queryEmbedding, opts.anchorCount);
  if (anchors.length === 0) {
    return { memories: [], edges: [], scores: new Map(), anchors: [] };
  }

  const anchorIds = anchors.map((a) => a.node.id);
  const anchorScoreMap = new Map<string, number>();
  for (const a of anchors) {
    anchorScoreMap.set(a.node.id, a.score);
  }
  // 锚点基准分（用于非锚点节点的评分基准，取最大锚点相似度）
  const baseAnchorScore = Math.max(...anchors.map((a) => a.score));

  // 3. 带权 BFS 展开
  const { nodes, edges, depths } = await store.expandNeighbors(
    anchorIds,
    opts.maxDepth
  );

  // 4. 评分
  const scores = new Map<string, number>();
  for (const node of nodes) {
    const depth = depths.get(node.id) ?? 0;
    // 锚点用自身相似度，非锚点用基准锚点分衰减
    const anchorScore =
      depth === 0
        ? (anchorScoreMap.get(node.id) ?? baseAnchorScore)
        : baseAnchorScore;
    const score =
      anchorScore *
      Math.pow(opts.hopDecay, depth) *
      node.importance *
      node.decayScore;
    if (score >= opts.minScore) {
      scores.set(node.id, score);
    }
  }

  // 5. 排序并截断
  const sortedNodes = nodes
    .filter((n) => scores.has(n.id))
    .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0))
    .slice(0, opts.maxNodes);

  const recalledIds = new Set(sortedNodes.map((n) => n.id));
  const recalledEdges = edges.filter(
    (e) => recalledIds.has(e.source) && recalledIds.has(e.target)
  );

  // 6. 异步强化被召回的记忆（不阻塞返回）
  const now = Date.now();
  for (const node of sortedNodes) {
    // fire-and-forget，避免召回延迟
    store
      .updateMemory(node.id, {
        lastAccessedAt: now,
        accessCount: node.accessCount + 1,
      })
      .catch((e) => console.error('[mnemo] 强化记忆失败:', e));
  }

  return {
    memories: sortedNodes,
    edges: recalledEdges,
    scores,
    anchors: anchorIds,
  };
}

/**
 * 将召回结果格式化为上下文字符串（注入 LLM 系统提示词）
 */
export function formatRecallContext(recall: RecallResult): string {
  if (recall.memories.length === 0) return '';
  const lines: string[] = ['## 相关记忆（按相关度排序）'];
  for (const node of recall.memories) {
    const score = recall.scores.get(node.id) ?? 0;
    const tag = `[${node.type} | 重要度:${node.importance.toFixed(2)} | 相关度:${score.toFixed(2)}]`;
    lines.push(`- ${tag} ${node.summary}`);
  }
  return lines.join('\n');
}
