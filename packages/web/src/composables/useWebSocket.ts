import { wsClient } from '@/services/ws';
import type { AgentEvent } from '@/services/types';

/** WebSocket 连接管理 composable */
export function useWebSocket() {
  function connect(url: string = '/ws') {
    wsClient.connect(url);
  }

  function onMessage(handler: (event: AgentEvent) => void) {
    return wsClient.onMessage(handler);
  }

  function onStatus(handler: (connected: boolean) => void) {
    return wsClient.onStatus(handler);
  }

  function send(data: unknown) {
    wsClient.send(data);
  }

  return {
    connect,
    onMessage,
    onStatus,
    send,
    connected: wsClient.connected,
  };
}
