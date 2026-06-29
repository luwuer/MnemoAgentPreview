<script setup lang="ts">
import { ref, onMounted } from 'vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import ChatPanel from '@/components/chat/ChatPanel.vue';
import MemoryGraph from '@/components/memory/MemoryGraph.vue';
import MemoryDetail from '@/components/memory/MemoryDetail.vue';
import { useChat } from '@/composables/useChat';
import { useMemoryGraph } from '@/composables/useMemoryGraph';
import { useMemoryStore } from '@/stores/memory';

const { init } = useChat();
const { loadGraph } = useMemoryGraph();
const memoryStore = useMemoryStore();

const leftWidth = ref(60);

onMounted(async () => {
  await init();
  await loadGraph();
});

// 拖拽调整面板宽度
let dragging = false;
function startDrag() {
  dragging = true;
  document.body.style.cursor = 'col-resize';
}
function onDrag(e: MouseEvent) {
  if (!dragging) return;
  const container = document.getElementById('chat-container');
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const percent = ((e.clientX - rect.left) / rect.width) * 100;
  leftWidth.value = Math.max(30, Math.min(80, percent));
}
function stopDrag() {
  dragging = false;
  document.body.style.cursor = '';
}

if (typeof window !== 'undefined') {
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', stopDrag);
}
</script>

<template>
  <div class="h-screen bg-gradient-neural">
    <AppHeader />
    <div
      id="chat-container"
      class="flex h-full pt-16"
    >
      <!-- 左侧对话面板 -->
      <div
        class="h-full overflow-hidden flex flex-col"
        :style="{ width: leftWidth + '%' }"
      >
        <ChatPanel />
      </div>

      <!-- 拖拽分隔条 -->
      <div
        class="w-1 h-full bg-white/5 hover:bg-primary/50 cursor-col-resize transition-colors relative group"
        @mousedown="startDrag"
      >
        <div
          class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 rounded-full bg-white/20 group-hover:bg-primary"
        />
      </div>

      <!-- 右侧记忆图谱面板 -->
      <div class="flex-1 h-full overflow-hidden flex flex-col">
        <MemoryGraph class="flex-1" />
        <MemoryDetail
          v-if="memoryStore.selectedNode"
          class="h-64 shrink-0"
        />
      </div>
    </div>
  </div>
</template>
