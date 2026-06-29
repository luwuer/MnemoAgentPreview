import type { FastifyInstance } from 'fastify';
import type { ServerContext } from '../server.js';
import { randomUUID } from 'node:crypto';

/**
 * Chat 路由
 *
 * POST /api/chat   — 发送消息（非流式，返回完整响应）
 * POST /api/chat/stream — 发送消息（流式，通过 WebSocket 推送，返回 session_id）
 */
export function registerChatRoutes(app: FastifyInstance, ctx: ServerContext) {
  // 非流式对话
  app.post('/api/chat', async (request, reply) => {
    const { message, sessionId } = (request.body ?? {}) as {
      message?: string;
      sessionId?: string;
    };
    if (!message) {
      return reply.code(400).send({ error: 'message is required' });
    }

    const sid = sessionId ?? randomUUID();
    let fullContent = '';

    try {
      for await (const event of ctx.agent.chat(sid, message)) {
        if (event.type === 'token') {
          fullContent += event.value;
        }
      }
      return { sessionId: sid, content: fullContent };
    } catch (e) {
      console.error('[mnemo] chat error:', e);
      return reply.code(500).send({ error: String(e) });
    }
  });

  // 流式对话 — 返回 session_id，实际流通过 WebSocket 推送
  app.post('/api/chat/stream', async (request, reply) => {
    const { sessionId } = (request.body ?? {}) as { sessionId?: string };
    const sid = sessionId ?? randomUUID();
    return { sessionId: sid, wsUrl: `/ws?sessionId=${sid}` };
  });

  // 获取会话历史
  app.get('/api/chat/:sessionId/messages', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const messages = ctx.agent.getSessionMessages(sessionId);
    return { sessionId, messages };
  });

  // 手动触发记忆固化
  app.post('/api/chat/:sessionId/consolidate', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const count = await ctx.agent.consolidate(sessionId);
    return { sessionId, consolidated: count };
  });
}
