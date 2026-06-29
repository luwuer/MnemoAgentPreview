import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface MemoryNodeData {
  id: string;
  type: 'episodic' | 'semantic' | 'procedural';
  content: string;
  summary: string;
  importance: number;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  decayScore: number;
  status: 'active' | 'decayed' | 'archived';
}

export interface MemoryEdgeData {
  id: string;
  source: string;
  target: string;
  type: string;
  weight: number;
}

export interface MemoryFilter {
  type?: string;
  minImportance?: number;
  search?: string;
}

export const useMemoryStore = defineStore('memory', () => {
  const nodes = ref<MemoryNodeData[]>([]);
  const edges = ref<MemoryEdgeData[]>([]);
  const selectedNodeId = ref<string | null>(null);
  const filter = ref<MemoryFilter>({});
  const loading = ref(false);
  const stats = ref({ total: 0, byType: {} as Record<string, number>, edges: 0 });

  const selectedNode = computed(() =>
    nodes.value.find((n) => n.id === selectedNodeId.value) ?? null
  );

  /** 过滤后的节点 */
  const filteredNodes = computed(() => {
    return nodes.value.filter((n) => {
      if (filter.value.type && n.type !== filter.value.type) return false;
      if (filter.value.minImportance !== undefined && n.importance < filter.value.minImportance) return false;
      if (filter.value.search) {
        const q = filter.value.search.toLowerCase();
        if (!n.summary.toLowerCase().includes(q) && !n.content.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  });

  /** 过滤后的边（两端节点都在过滤结果中） */
  const filteredEdges = computed(() => {
    const ids = new Set(filteredNodes.value.map((n) => n.id));
    return edges.value.filter((e) => ids.has(e.source) && ids.has(e.target));
  });

  function setGraph(graphNodes: MemoryNodeData[], graphEdges: MemoryEdgeData[]) {
    nodes.value = graphNodes;
    edges.value = graphEdges;
  }

  function selectNode(id: string | null) {
    selectedNodeId.value = id;
  }

  function setFilter(f: Partial<MemoryFilter>) {
    filter.value = { ...filter.value, ...f };
  }

  function resetFilter() {
    filter.value = {};
  }

  function setStats(s: { total: number; byType: Record<string, number>; edges: number }) {
    stats.value = s;
  }

  return {
    nodes,
    edges,
    selectedNodeId,
    selectedNode,
    filter,
    filteredNodes,
    filteredEdges,
    loading,
    stats,
    setGraph,
    selectNode,
    setFilter,
    resetFilter,
    setStats,
  };
});
