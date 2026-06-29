import { ref } from 'vue';
import type { AgentEvent } from './types';

/**
 * WebSocket 客户端封装
 *
 * 管理 WebSocket 连接、消息分发、断线重连
 */
class WSClient {
  private socket: WebSocket | null = null;
  private url = '';
  private reconnectAttempts = 0;
  private maxReconnect = 5;
  private listeners = new Set<(event: AgentEvent) => void>();
  private statusListeners = new Set<(connected: boolean) => void>();
  public connected = ref(false);

  connect(url: string) {
    this.url = url;
    this.doConnect();
  }

  private doConnect() {
    if (this.socket) {
      this.socket.close();
    }
    const wsUrl = this.url.startsWith('ws')
      ? this.url
      : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${this.url}`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.connected.value = true;
      this.reconnectAttempts = 0;
      this.statusListeners.forEach((l) => l(true));
    };

    this.socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as AgentEvent;
        if ((data as { type: string }).type === 'ping') {
          this.send({ type: 'pong' });
          return;
        }
        this.listeners.forEach((l) => l(data));
      } catch {
        // ignore
      }
    };

    this.socket.onclose = () => {
      this.connected.value = false;
      this.statusListeners.forEach((l) => l(false));
      if (this.reconnectAttempts < this.maxReconnect) {
        this.reconnectAttempts++;
        setTimeout(() => this.doConnect(), 2000 * this.reconnectAttempts);
      }
    };

    this.socket.onerror = () => {
      console.error('[ws] 连接错误');
    };
  }

  send(data: unknown) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  onMessage(listener: (event: AgentEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStatus(listener: (connected: boolean) => void) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  close() {
    this.maxReconnect = 0;
    this.socket?.close();
  }
}

export const wsClient = new WSClient();
