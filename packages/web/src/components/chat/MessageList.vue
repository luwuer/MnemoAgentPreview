<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { Brain, Sparkles } from 'lucide-vue-next';
import MessageBubble from './MessageBubble.vue';
import type { Message } from '@/services/types';

const props = defineProps<{ messages: Message[] }>();
const container = ref<HTMLElement>();

function scrollToBottom() {
  nextTick(() => {
    if (container.value) {
      container.value.scrollTop = container.value.scrollHeight;
    }
  });
}

watch(() => props.messages.length, scrollToBottom);
watch(
  () => props.messages[props.messages.length - 1]?.content,
  scrollToBottom
);

const suggestions = [
  '帮我回忆一下之前聊过的内容',
  '记住：我喜欢用 TypeScript 开发',
  '我有哪些记忆？',
];
</script>

<template>
  <div ref="container" class="flex-1 overflow-y-auto custom-scroll px-2">
    <!-- 空状态 -->
    <div
      v-if="messages.length === 0"
      class="h-full flex flex-col items-center justify-center text-center px-8"
    >
      <div
        class="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center mb-8 animate-pulse-glow"
      >
        <Brain class="w-14 h-14 text-white" />
      </div>
      <h2 class="text-3xl font-semibold gradient-text mb-3">Mnemo</h2>
      <p class="text-text-secondary mb-8">你的记忆助理，拥有人类般的记忆机制</p>
      <div class="flex flex-wrap gap-3 justify-center max-w-lg">
        <button
          v-for="s in suggestions"
          :key="s"
          class="glass-panel px-4 py-2 rounded-xl text-sm text-text-secondary hover:text-primary-light hover:border-primary/30 transition-all flex items-center gap-2"
        >
          <Sparkles class="w-3.5 h-3.5 text-primary-light" />
          {{ s }}
        </button>
      </div>
    </div>

    <!-- 消息列表 -->
    <div v-else class="space-y-6 py-4">
      <MessageBubble v-for="msg in messages" :key="msg.id" :message="msg" />
    </div>
  </div>
</template>
