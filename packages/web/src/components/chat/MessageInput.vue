<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { Send, Square } from 'lucide-vue-next';

const props = defineProps<{ streaming: boolean }>();
const emit = defineEmits<{ send: [text: string]; stop: [] }>();

const text = ref('');
const textarea = ref<HTMLTextAreaElement>();

function autoResize() {
  nextTick(() => {
    if (textarea.value) {
      textarea.value.style.height = 'auto';
      textarea.value.style.height = Math.min(textarea.value.scrollHeight, 128) + 'px';
    }
  });
}

function handleSend() {
  if (props.streaming || !text.value.trim()) return;
  emit('send', text.value);
  text.value = '';
  autoResize();
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
}
</script>

<template>
  <div class="mt-4">
    <div class="glass-panel rounded-2xl p-2 flex items-end gap-2 focus-within:border-primary/40 transition-colors">
      <textarea
        ref="textarea"
        v-model="text"
        class="flex-1 bg-transparent text-text-primary placeholder-text-muted resize-none outline-none px-3 py-2 max-h-32 min-h-[40px] custom-scroll text-body"
        placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
        rows="1"
        @keydown="handleKeydown"
        @input="autoResize"
      />
      <button
        v-if="!streaming"
        class="glow-btn shrink-0 flex items-center gap-1.5"
        :disabled="!text.trim()"
        :class="!text.trim() ? 'opacity-50 cursor-not-allowed' : ''"
        @click="handleSend"
      >
        <Send class="w-4 h-4" />
        发送
      </button>
      <button
        v-else
        class="px-4 py-2 rounded-xl bg-functional-red/20 text-functional-red hover:bg-functional-red/30 transition-all flex items-center gap-1.5 shrink-0"
        @click="emit('stop')"
      >
        <Square class="w-4 h-4" />
        停止
      </button>
    </div>
  </div>
</template>
