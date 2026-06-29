import type { FastifyInstance } from 'fastify';
import type { ServerContext } from '../server.js';

/**
 * WebSocket 处理器
 *
 * 协议：
 * 客户端 → 服务端: { type: 'chat', sessionId, message }
 * 服务端 → 客户端: AgentEvent (token / tool_call / tool_result / memory_recalled / done / error)
 *
 * 同时支持 30s 心跳保活
 */
export function registerWSHandler(app: FastifyInstance, ctx: ServerContext) {
  app.get('/ws', { websocket: true }, (socket, request) => {
    const query = request.query as { sessionId?: string };
    let heartbeatTimer: NodeJS.Timeout | null = null;

    // 心跳保活
    const startHeartbeat = () => {
      heartbeatTimer = setInterval(() => {
        if (socket.readyState === 1) {
          socket.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30_000);
    };
    startHeartbeat();

    socket.on('message', async (raw: Buffer) => {
      let data: { type: string; sessionId?: string; message?: string };
      try {
        data = JSON.parse(raw.toString());
      } catch {
        socket.send(
          JSON.stringify({ type: 'error', message: 'Invalid JSON' })
        );
        return;
      }

      if (data.type === 'pong') return;

      if (data.type === 'chat' && data.message) {
        const sessionId = data.sessionId ?? query.sessionId ?? crypto.randomUUID();
        try {
          for await (const event of ctx.agent.chat(sessionId, data.message)) {
            socket.send(JSON.stringify(event));
          }
        } catch (e) {
          socket.send(
            JSON.stringify({ type: 'error', message: String(e) })
          );
        }
      }
    });

    socket.on('close', () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    });
  });
}
