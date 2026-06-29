<script setup lang="ts">
import { ref, onMounted } from 'vue';
import MessageList from './MessageList.vue';
import MessageInput from './MessageInput.vue';
import { useChatStore } from '@/stores/chat';
import { useChat } from '@/composables/useChat';
import { useMemoryStore } from '@/stores/memory';
import { getMemoryStats } from '@/services/api';
import { useWebSocket } from '@/composables/useWebSocket';

const chatStore = useChatStore();
const { send, stop } = useChat();
const memoryStore = useMemoryStore();
const { connected } = useWebSocket();

const stats = ref({ total: 0, byType: {} as Record<string, number>, edges: 0 });

onMounted(async () => {
  try {
    const s = await getMemoryStats();
    stats.value = s;
    memoryStore.setStats(s);
  } catch (e) {
    console.error(e);
  }
});
</script>

<template>
  <div class="flex flex-col h-full p-4">
    <MessageList :messages="chatStore.messages" class="flex-1" />
    <MessageInput
      :streaming="chatStore.isStreaming"
      @send="send"
      @stop="stop"
    />
    <div class="flex items-center justify-between mt-3 px-2 text-xs text-text-muted">
      <div class="flex items-center gap-2">
        <span
          class="w-2 h-2 rounded-full"
          :class="connected ? 'bg-functional-green animate-pulse' : 'bg-functional-red'"
        />
        <span>{{ connected ? '已连接' : '断开连接' }}</span>
      </div>
      <span>记忆: {{ stats.total }} 条 · 关联: {{ stats.edges }} 条</span>
    </div>
  </div>
</template>
