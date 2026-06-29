import type { MemoryStore } from './store.js';
import type { Embedder } from './recall.js';
import type { ChatMessage, MemoryNode, MemoryType } from '../types/index.js';

/** LLM 从对话中提取的记忆片段 */
export interface ExtractedMemory {
  type: MemoryType;
  content: string;
  summary: string;
  importance: number;
}

/** 记忆提取器接口（由 Agent 层注入 LLM 实现） */
export interface MemoryExtractor {
  extract(messages: ChatMessage[]): Promise<ExtractedMemory[]>;
}

/**
 * 记忆固化流程
 *
 * 将对话中的短期工作记忆沉淀为长期记忆：
 * 1. LLM 从对话提取关键事实/事件/偏好
 * 2. 为每条记忆生成 embedding
 * 3. 创建记忆节点
 * 4. 自动建立关联边（SIMILAR 向量相似 / TEMPORAL 时间顺承 / ASSOCIATIVE 联想）
 *
 * @param messages 待固化的对话消息
 * @param store 记忆存储
 * @param embedder 嵌入向量生成器
 * @param extractor 记忆提取器（LLM）
 * @returns 新创建的记忆节点列表
 */
export async function consolidateMemories(
  messages: ChatMessage[],
  store: MemoryStore,
  embedder: Embedder,
  extractor: MemoryExtractor
): Promise<MemoryNode[]> {
  // 1. 提取记忆
  const extracted = await extractor.extract(messages);
  if (extracted.length === 0) return [];

  // 2. 批量生成 embedding
  const texts = extracted.map((e) => e.summary || e.content);
  const embeddings = await embedder.embed(texts);

  // 3. 创建记忆节点
  const created: MemoryNode[] = [];
  for (let i = 0; i < extracted.length; i++) {
    const ext = extracted[i];
    const node = await store.createMemory({
      type: ext.type,
      content: ext.content,
      summary: ext.summary,
      importance: ext.importance,
      embedding: embeddings[i],
    });
    created.push(node);
  }

  // 4. 自动建立关联
  for (let i = 0; i < created.length; i++) {
    const node = created[i];

    // 4a. 与已有记忆建立 SIMILAR 关联（向量相似度）
    if (node.embedding) {
      const similar = await store.vectorSearch(node.embedding, 5);
      for (const s of similar) {
        if (s.node.id === node.id) continue;
        if (s.score > 0.7) {
          await store.createEdge({
            source: node.id,
            target: s.node.id,
            type: 'SIMILAR',
            weight: s.score,
            metadata: { source: 'auto-consolidation', similarity: s.score },
          });
        }
      }
    }

    // 4b. 与同批次记忆建立 TEMPORAL 关联（按提取顺序）
    if (i > 0) {
      await store.createEdge({
        source: created[i - 1].id,
        target: node.id,
        type: 'TEMPORAL',
        weight: 0.8,
        metadata: { source: 'auto-consolidation' },
      });
    }
  }

  return created;
}
