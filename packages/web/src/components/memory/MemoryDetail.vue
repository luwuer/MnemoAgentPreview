<script setup lang="ts">
import { computed } from 'vue';
import { Clock, Hash, Activity, TrendingDown, Link2 } from 'lucide-vue-next';
import { useMemoryStore } from '@/stores/memory';
import { formatTime } from '@/lib/utils';

defineProps<{ fullscreen?: boolean }>();

const memoryStore = useMemoryStore();

const typeLabels: Record<string, string> = {
  episodic: '事件记忆',
  semantic: '知识记忆',
  procedural: '流程记忆',
};
const typeColors: Record<string, string> = {
  episodic: 'text-functional-blue',
  semantic: 'text-functional-green',
  procedural: 'text-functional-amber',
};

const relatedEdges = computed(() => {
  if (!memoryStore.selectedNode) return [];
  return memoryStore.edges.filter(
    (e) => e.source === memoryStore.selectedNodeId || e.target === memoryStore.selectedNodeId
  );
});
</script>

<template>
  <div v-if="memoryStore.selectedNode" class="h-full overflow-y-auto custom-scroll p-4">
    <div class="space-y-4">
      <!-- 类型与摘要 -->
      <div>
        <div class="flex items-center gap-2 mb-2">
          <span :class="typeColors[memoryStore.selectedNode.type]" class="text-xs font-medium px-2 py-0.5 rounded-full bg-white/5">
            {{ typeLabels[memoryStore.selectedNode.type] }}
          </span>
          <span v-if="memoryStore.selectedNode.status === 'decayed'" class="text-xs text-text-muted px-2 py-0.5 rounded-full bg-white/5">
            已衰减
          </span>
        </div>
        <h3 class="text-lg font-medium text-text-primary leading-snug">
          {{ memoryStore.selectedNode.summary }}
        </h3>
      </div>

      <!-- 完整内容 -->
      <div class="glass-panel rounded-xl p-3">
        <div class="text-xs text-text-muted mb-1.5">内容</div>
        <p class="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
          {{ memoryStore.selectedNode.content }}
        </p>
      </div>

      <!-- 元数据 -->
      <div class="grid grid-cols-2 gap-2">
        <div class="glass-panel rounded-xl p-3">
          <div class="flex items-center gap-1.5 text-xs text-text-muted mb-1">
            <Activity class="w-3 h-3" />
            重要度
          </div>
          <div class="text-text-primary font-medium">
            {{ memoryStore.selectedNode.importance.toFixed(2) }}
          </div>
        </div>
        <div class="glass-panel rounded-xl p-3">
          <div class="flex items-center gap-1.5 text-xs text-text-muted mb-1">
            <TrendingDown class="w-3 h-3" />
            衰减值
          </div>
          <div class="text-text-primary font-medium">
            {{ memoryStore.selectedNode.decayScore.toFixed(2) }}
          </div>
        </div>
        <div class="glass-panel rounded-xl p-3">
          <div class="flex items-center gap-1.5 text-xs text-text-muted mb-1">
            <Hash class="w-3 h-3" />
            访问次数
          </div>
          <div class="text-text-primary font-medium">
            {{ memoryStore.selectedNode.accessCount }}
          </div>
        </div>
        <div class="glass-panel rounded-xl p-3">
          <div class="flex items-center gap-1.5 text-xs text-text-muted mb-1">
            <Clock class="w-3 h-3" />
            创建时间
          </div>
          <div class="text-text-primary font-medium text-xs">
            {{ formatTime(memoryStore.selectedNode.createdAt) }}
          </div>
        </div>
      </div>

      <!-- 关联记忆 -->
      <div v-if="relatedEdges.length > 0">
        <div class="flex items-center gap-1.5 text-xs text-text-muted mb-2">
          <Link2 class="w-3.5 h-3.5" />
          关联记忆 ({{ relatedEdges.length }})
        </div>
        <div class="space-y-1.5">
          <div
            v-for="edge in relatedEdges.slice(0, 8)"
            :key="edge.id"
            class="glass-panel rounded-lg p-2 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-all"
            @click="memoryStore.selectNode(edge.source === memoryStore.selectedNodeId ? edge.target : edge.source)"
          >
            <span class="text-xs text-text-secondary">{{ edge.type }}</span>
            <span class="text-xs text-primary-light">
              {{ edge.source === memoryStore.selectedNodeId ? edge.target.slice(0, 8) : edge.source.slice(0, 8) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
