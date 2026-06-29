import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Message } from '@/services/types';
import { uuid } from '@/lib/utils';

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Message[]>([]);
  const sessionId = ref<string>('');
  const isStreaming = ref(false);
  const streamingMessageId = ref<string | null>(null);

  const messageCount = computed(() => messages.value.length);

  /** 设置会话 ID */
  function setSessionId(id: string) {
    sessionId.value = id;
  }

  /** 添加用户消息 */
  function addUserMessage(content: string): string {
    const id = uuid();
    messages.value.push({
      id,
      role: 'user',
      content,
      createdAt: Date.now(),
    });
    return id;
  }

  /** 开始流式助手消息 */
  function startAssistantMessage(): string {
    const id = uuid();
    messages.value.push({
      id,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      streaming: true,
      toolCalls: [],
    });
    streamingMessageId.value = id;
    isStreaming.value = true;
    return id;
  }

  /** 追加流式 token */
  function appendToken(token: string) {
    if (streamingMessageId.value) {
      const msg = messages.value.find((m) => m.id === streamingMessageId.value);
      if (msg) msg.content += token;
    }
  }

  /** 添加工具调用记录 */
  function addToolCall(tool: string, args: string) {
    if (streamingMessageId.value) {
      const msg = messages.value.find((m) => m.id === streamingMessageId.value);
      msg?.toolCalls?.push({ tool, args });
    }
  }

  /** 更新工具结果 */
  function addToolResult(toolCallId: string, result: string) {
    if (streamingMessageId.value) {
      const msg = messages.value.find((m) => m.id === streamingMessageId.value);
      const call = msg?.toolCalls?.find((c) => !c.result);
      if (call) call.result = result;
    }
  }

  /** 标记召回的记忆 */
  function setRecalledMemoryIds(ids: string[]) {
    if (streamingMessageId.value) {
      const msg = messages.value.find((m) => m.id === streamingMessageId.value);
      if (msg) msg.recalledMemoryIds = ids;
    }
  }

  /** 完成流式消息 */
  function finishStreaming() {
    if (streamingMessageId.value) {
      const msg = messages.value.find((m) => m.id === streamingMessageId.value);
      if (msg) msg.streaming = false;
    }
    streamingMessageId.value = null;
    isStreaming.value = false;
  }

  /** 清空消息 */
  function clear() {
    messages.value = [];
    streamingMessageId.value = null;
    isStreaming.value = false;
  }

  return {
    messages,
    sessionId,
    isStreaming,
    streamingMessageId,
    messageCount,
    setSessionId,
    addUserMessage,
    startAssistantMessage,
    appendToken,
    addToolCall,
    addToolResult,
    setRecalledMemoryIds,
    finishStreaming,
    clear,
  };
});
