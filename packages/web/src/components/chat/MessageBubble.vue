<script setup lang="ts">
import { computed } from 'vue';
import { Brain, User, Wrench, Network } from 'lucide-vue-next';
import { renderMarkdown } from '@/lib/markdown';
import { formatTime } from '@/lib/utils';
import type { Message } from '@/services/types';

const props = defineProps<{ message: Message }>();

const isUser = computed(() => props.message.role === 'user');
const renderedContent = computed(() =>
  isUser.value ? props.message.content : renderMarkdown(props.message.content)
);
</script>

<template>
  <div class="flex gap-3 animate-slide-up" :class="isUser ? 'flex-row-reverse' : 'flex-row'">
    <!-- 头像 -->
    <div
      class="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
      :class="isUser ? 'bg-bg-deep' : 'bg-gradient-to-br from-primary to-primary-light'"
    >
      <User v-if="isUser" class="w-5 h-5 text-text-secondary" />
      <Brain v-else class="w-5 h-5 text-white" />
    </div>

    <!-- 消息体 -->
    <div class="max-w-[80%] flex flex-col" :class="isUser ? 'items-end' : 'items-start'">
      <div
        class="rounded-2xl px-4 py-3"
        :class="isUser ? 'bg-primary/20 text-text-primary' : 'glass-panel'"
      >
        <div v-if="isUser" class="text-body whitespace-pre-wrap break-words">{{ message.content }}</div>
        <div v-else class="markdown-body text-body break-words" v-html="renderedContent"></div>
        <span
          v-if="message.streaming"
          class="inline-block w-2 h-4 bg-primary-light animate-pulse ml-1 align-middle"
        />
      </div>

      <!-- 召回记忆标记 -->
      <div
        v-if="message.recalledMemoryIds && message.recalledMemoryIds.length"
        class="mt-1.5 flex items-center gap-1 text-xs text-primary-light/70"
      >
        <Network class="w-3 h-3" />
        <span>召回 {{ message.recalledMemoryIds.length }} 条关联记忆</span>
      </div>

      <!-- 工具调用记录 -->
      <div
        v-if="message.toolCalls && message.toolCalls.length"
        class="mt-1.5 space-y-1"
      >
        <div
          v-for="(tc, i) in message.toolCalls"
          :key="i"
          class="text-xs text-text-muted flex items-center gap-1.5 px-2 py-1 rounded-lg bg-bg-deep/50"
        >
          <Wrench class="w-3 h-3 text-functional-amber" />
          <span class="text-primary-light">{{ tc.tool }}</span>
          <span v-if="tc.result" class="text-functional-green">✓</span>
        </div>
      </div>

      <span class="text-xs text-text-muted mt-1 px-1">{{ formatTime(message.createdAt) }}</span>
    </div>
  </div>
</template>
