import { useChatStore } from '@/stores/chat';
import { useMemoryStore } from '@/stores/memory';
import { wsClient } from '@/services/ws';
import { createStreamSession, getMemoryGraph } from '@/services/api';
import type { AgentEvent } from '@/services/types';

/** 聊天逻辑 composable — 发送消息、流式接收、停止 */
export function useChat() {
  const chatStore = useChatStore();
  const memoryStore = useMemoryStore();
  let initialized = false;

  /** 初始化会话与 WebSocket */
  async function init() {
    if (initialized) return;
    initialized = true;

    try {
      const { sessionId } = await createStreamSession();
      chatStore.setSessionId(sessionId);

      if (!wsClient.connected.value) {
        wsClient.connect(`/ws?sessionId=${sessionId}`);
      }

      wsClient.onMessage((event: AgentEvent) => {
        switch (event.type) {
          case 'token':
            chatStore.appendToken(event.value);
            break;
          case 'tool_call':
            chatStore.addToolCall(event.tool, event.args);
            break;
          case 'tool_result':
            chatStore.addToolResult(event.toolCallId, event.result);
            break;
          case 'memory_recalled':
            chatStore.setRecalledMemoryIds(event.memoryIds);
            break;
          case 'done':
            chatStore.finishStreaming();
            refreshMemoryGraph();
            break;
          case 'error':
            console.error('[chat] agent error:', event.message);
            chatStore.finishStreaming();
            break;
        }
      });
    } catch (e) {
      console.error('[chat] 初始化失败:', e);
    }
  }

  /** 发送消息 */
  async function send(message: string) {
    if (chatStore.isStreaming || !message.trim()) return;
    chatStore.addUserMessage(message);
    chatStore.startAssistantMessage();
    wsClient.send({
      type: 'chat',
      sessionId: chatStore.sessionId,
      message,
    });
  }

  /** 停止生成 */
  function stop() {
    chatStore.finishStreaming();
  }

  /** 刷新记忆图 */
  async function refreshMemoryGraph() {
    try {
      const graph = await getMemoryGraph();
      memoryStore.setGraph(graph.nodes, graph.edges);
    } catch (e) {
      console.error('[chat] 刷新记忆图失败:', e);
    }
  }

  return { init, send, stop, refreshMemoryGraph };
}
