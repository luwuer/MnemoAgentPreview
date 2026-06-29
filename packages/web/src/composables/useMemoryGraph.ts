import { useMemoryStore } from '@/stores/memory';
import { getMemoryGraph, getMemoryStats, getMemorySubgraph } from '@/services/api';

/** 记忆图谱逻辑 composable — 加载、展开节点、过滤 */
export function useMemoryGraph() {
  const memoryStore = useMemoryStore();

  /** 加载完整记忆图 + 统计 */
  async function loadGraph() {
    memoryStore.loading = true;
    try {
      const [graph, stats] = await Promise.all([
        getMemoryGraph(),
        getMemoryStats(),
      ]);
      memoryStore.setGraph(graph.nodes, graph.edges);
      memoryStore.setStats(stats);
    } catch (e) {
      console.error('[memory] 加载图谱失败:', e);
    } finally {
      memoryStore.loading = false;
    }
  }

  /** 渐进式展开节点邻居（点击节点时调用） */
  async function expandNode(nodeId: string, depth = 1) {
    try {
      const subgraph = await getMemorySubgraph(nodeId, depth);
      const existingNodeIds = new Set(memoryStore.nodes.map((n) => n.id));
      const existingEdgeIds = new Set(memoryStore.edges.map((e) => e.id));
      const newNodes = subgraph.nodes.filter(
        (n) => !existingNodeIds.has(n.id)
      );
      const newEdges = subgraph.edges.filter(
        (e) => !existingEdgeIds.has(e.id)
      );
      memoryStore.setGraph(
        [...memoryStore.nodes, ...newNodes],
        [...memoryStore.edges, ...newEdges]
      );
    } catch (e) {
      console.error('[memory] 展开节点失败:', e);
    }
  }

  return { loadGraph, expandNode };
}
