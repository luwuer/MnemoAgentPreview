<script setup lang="ts">
import { Search, Filter } from 'lucide-vue-next';
import { useMemoryStore } from '@/stores/memory';

const memoryStore = useMemoryStore();

const typeOptions = [
  { label: '事件记忆', value: 'episodic', color: '#3B82F6' },
  { label: '知识记忆', value: 'semantic', color: '#10B981' },
  { label: '流程记忆', value: 'procedural', color: '#F59E0B' },
];

function toggleType(type: string) {
  memoryStore.setFilter({
    type: memoryStore.filter.type === type ? undefined : type,
  });
}
</script>

<template>
  <div class="space-y-4">
    <!-- 搜索 -->
    <div>
      <label class="text-xs text-text-muted mb-2 block">搜索记忆</label>
      <div class="glass-panel rounded-xl flex items-center gap-2 px-3 py-2">
        <Search class="w-4 h-4 text-text-muted" />
        <input
          :value="memoryStore.filter.search ?? ''"
          class="flex-1 bg-transparent text-text-primary placeholder-text-muted outline-none text-sm"
          placeholder="搜索记忆内容..."
          @input="memoryStore.setFilter({ search: ($event.target as HTMLInputElement).value })"
        />
      </div>
    </div>

    <!-- 类型筛选 -->
    <div>
      <label class="text-xs text-text-muted mb-2 block flex items-center gap-1">
        <Filter class="w-3 h-3" />
        记忆类型
      </label>
      <div class="space-y-1.5">
        <button
          v-for="opt in typeOptions"
          :key="opt.value"
          class="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
          :class="memoryStore.filter.type === opt.value
            ? 'bg-white/10 text-text-primary'
            : 'text-text-secondary hover:bg-white/5'"
          @click="toggleType(opt.value)"
        >
          <span class="w-3 h-3 rounded-full" :style="{ background: opt.color }" />
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- 重要度阈值 -->
    <div>
      <label class="text-xs text-text-muted mb-2 block">
        最低重要度: {{ (memoryStore.filter.minImportance ?? 0).toFixed(1) }}
      </label>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        :value="memoryStore.filter.minImportance ?? 0"
        class="w-full accent-primary"
        @input="memoryStore.setFilter({ minImportance: Number(($event.target as HTMLInputElement).value) })"
      />
    </div>

    <!-- 统计 -->
    <div class="glass-panel rounded-xl p-3 space-y-2">
      <div class="text-xs text-text-muted">记忆统计</div>
      <div class="flex justify-between text-sm">
        <span class="text-text-secondary">总记忆</span>
        <span class="text-text-primary font-medium">{{ memoryStore.stats.total }}</span>
      </div>
      <div class="flex justify-between text-sm">
        <span class="text-text-secondary">关联边</span>
        <span class="text-text-primary font-medium">{{ memoryStore.stats.edges }}</span>
      </div>
    </div>

    <!-- 重置 -->
    <button
      class="w-full py-2 rounded-xl text-sm text-text-secondary hover:text-primary-light hover:bg-white/5 transition-all"
      @click="memoryStore.resetFilter()"
    >
      重置筛选
    </button>
  </div>
</template>
