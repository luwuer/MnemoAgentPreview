<script setup lang="ts">
import { ref, shallowRef, onMounted, onBeforeUnmount, watch } from 'vue';
import {
  Network,
  DataSet,
  type Node as VisNode,
  type Edge as VisEdge,
  type Options,
} from 'vis-network/standalone';
import { ZoomIn, ZoomOut, Maximize2, Network as NetworkIcon } from 'lucide-vue-next';
import { useMemoryStore, type MemoryNodeData, type MemoryEdgeData } from '@/stores/memory';
import { useMemoryGraph } from '@/composables/useMemoryGraph';

defineProps<{ fullscreen?: boolean }>();

const memoryStore = useMemoryStore();
const { expandNode } = useMemoryGraph();
const container = ref<HTMLElement>();
const network = shallowRef<Network | null>(null);
let nodesDataSet: DataSet<VisNode> | null = null;
let edgesDataSet: DataSet<VisEdge> | null = null;

const TYPE_COLORS: Record<string, string> = {
  episodic: '#3B82F6',
  semantic: '#10B981',
  procedural: '#F59E0B',
};
const EDGE_COLORS: Record<string, string> = {
  TEMPORAL: '#8B5CF6',
  CAUSAL: '#EF4444',
  SIMILAR: '#06B6D4',
  PART_OF: '#F59E0B',
  REFERENCES: '#EC4899',
  ASSOCIATIVE: '#6366F1',
  DERIVED_FROM: '#A5B4FC',
};

function toVisNodes(nodes: MemoryNodeData[]): VisNode[] {
  return nodes.map((n) => ({
    id: n.id,
    label: n.summary.slice(0, 24),
    color: {
      background: TYPE_COLORS[n.type] ?? '#6366F1',
      border: n.status === 'decayed' ? '#475569' : TYPE_COLORS[n.type] ?? '#6366F1',
    },
    shape: 'dot',
    size: 12 + n.importance * 18,
    opacity: n.status === 'decayed' ? 0.4 : 1,
    title: `${n.summary}\n[${n.type}] 重要度: ${n.importance.toFixed(2)} | 衰减: ${n.decayScore.toFixed(2)}`,
  }));
}

function toVisEdges(edges: MemoryEdgeData[]): VisEdge[] {
  return edges.map((e) => ({
    id: e.id,
    from: e.source,
    to: e.target,
    color: { color: EDGE_COLORS[e.type] ?? '#6366F1', opacity: 0.5 },
    width: 1 + e.weight * 2,
    title: e.type,
  }));
}

function initNetwork() {
  if (!container.value) return;
  nodesDataSet = new DataSet<VisNode>(toVisNodes(memoryStore.filteredNodes));
  edgesDataSet = new DataSet<VisEdge>(toVisEdges(memoryStore.filteredEdges));
  const options: Options = {
    physics: {
      barnesHut: { gravitationalConstant: -3000, centralGravity: 0.3, springLength: 120 },
      stabilization: { iterations: 100 },
    },
    interaction: { hover: true, tooltipDelay: 200, navigationButtons: false },
    nodes: { font: { color: '#CBD5E1', size: 12 } },
  };
  network.value = new Network(container.value, { nodes: nodesDataSet, edges: edgesDataSet }, options);

  network.value.on('click', (params: { nodes: string[] }) => {
    if (params.nodes.length > 0) {
      const nodeId = params.nodes[0];
      memoryStore.selectNode(nodeId);
      expandNode(nodeId, 1);
    } else {
      memoryStore.selectNode(null);
    }
  });
}

function updateGraph() {
  if (!nodesDataSet || !edgesDataSet) return;
  nodesDataSet.clear();
  nodesDataSet.add(toVisNodes(memoryStore.filteredNodes));
  edgesDataSet.clear();
  edgesDataSet.add(toVisEdges(memoryStore.filteredEdges));
}

watch(
  () => [memoryStore.filteredNodes, memoryStore.filteredEdges],
  () => updateGraph(),
  { deep: true }
);

onMounted(() => initNetwork());
onBeforeUnmount(() => network.value?.destroy());

function zoomIn() {
  if (network.value) network.value.moveTo({ scale: network.value.getScale() * 1.3 });
}
function zoomOut() {
  if (network.value) network.value.moveTo({ scale: network.value.getScale() / 1.3 });
}
function fit() {
  network.value?.fit({ animation: true });
}
</script>

<template>
  <div class="relative h-full w-full">
    <!-- 图谱容器 -->
    <div ref="container" class="h-full w-full" />

    <!-- 空状态 -->
    <div
      v-if="memoryStore.nodes.length === 0"
      class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
    >
      <NetworkIcon class="w-12 h-12 text-text-muted mb-3 opacity-50" />
      <p class="text-text-muted text-sm">暂无记忆，开始对话后将自动生成记忆图谱</p>
    </div>

    <!-- 加载状态 -->
    <div
      v-if="memoryStore.loading"
      class="absolute top-4 right-4 glass-panel px-3 py-1.5 rounded-lg text-xs text-text-secondary flex items-center gap-2"
    >
      <span class="w-2 h-2 rounded-full bg-primary-light animate-pulse" />
      加载中...
    </div>

    <!-- 工具栏 -->
    <div class="absolute bottom-4 right-4 flex flex-col gap-1.5">
      <button class="w-9 h-9 glass-panel rounded-lg flex items-center justify-center text-text-secondary hover:text-primary-light transition-all" @click="zoomIn">
        <ZoomIn class="w-4 h-4" />
      </button>
      <button class="w-9 h-9 glass-panel rounded-lg flex items-center justify-center text-text-secondary hover:text-primary-light transition-all" @click="zoomOut">
        <ZoomOut class="w-4 h-4" />
      </button>
      <button class="w-9 h-9 glass-panel rounded-lg flex items-center justify-center text-text-secondary hover:text-primary-light transition-all" @click="fit">
        <Maximize2 class="w-4 h-4" />
      </button>
    </div>

    <!-- 图例 -->
    <div class="absolute top-4 left-4 glass-panel rounded-xl p-3 space-y-1.5">
      <div class="text-xs text-text-muted mb-1">记忆类型</div>
      <div class="flex items-center gap-2 text-xs">
        <span class="w-3 h-3 rounded-full" style="background:#3B82F6" />
        <span class="text-text-secondary">事件记忆</span>
      </div>
      <div class="flex items-center gap-2 text-xs">
        <span class="w-3 h-3 rounded-full" style="background:#10B981" />
        <span class="text-text-secondary">知识记忆</span>
      </div>
      <div class="flex items-center gap-2 text-xs">
        <span class="w-3 h-3 rounded-full" style="background:#F59E0B" />
        <span class="text-text-secondary">流程记忆</span>
      </div>
    </div>
  </div>
</template>
