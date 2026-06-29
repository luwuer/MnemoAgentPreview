<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft } from 'lucide-vue-next';
import AppHeader from '@/components/layout/AppHeader.vue';
import MemoryGraph from '@/components/memory/MemoryGraph.vue';
import MemoryDetail from '@/components/memory/MemoryDetail.vue';
import MemoryFilters from '@/components/memory/MemoryFilters.vue';
import { useMemoryGraph } from '@/composables/useMemoryGraph';
import { useMemoryStore } from '@/stores/memory';

const router = useRouter();
const { loadGraph } = useMemoryGraph();
const memoryStore = useMemoryStore();

onMounted(() => loadGraph());
</script>

<template>
  <div class="h-screen bg-gradient-neural">
    <AppHeader />
    <div class="flex h-full pt-16">
      <!-- 左侧筛选面板 -->
      <aside class="w-72 h-full overflow-y-auto custom-scroll glass-panel rounded-none border-y-0 border-l-0 p-4">
        <div class="flex items-center gap-2 mb-4">
          <button
            class="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all"
            @click="router.push('/')"
          >
            <ArrowLeft class="w-4 h-4" />
          </button>
          <h2 class="text-lg font-medium text-text-primary">记忆浏览器</h2>
        </div>
        <MemoryFilters />
      </aside>

      <!-- 中央图谱 -->
      <div class="flex-1 h-full overflow-hidden">
        <MemoryGraph :fullscreen="true" />
      </div>

      <!-- 右侧详情 -->
      <aside
        v-if="memoryStore.selectedNode"
        class="w-80 h-full overflow-y-auto custom-scroll glass-panel rounded-none border-y-0 border-r-0 p-4"
      >
        <MemoryDetail :fullscreen="true" />
      </aside>
    </div>
  </div>
</template>
