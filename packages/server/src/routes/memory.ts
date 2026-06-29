import type { FastifyInstance } from 'fastify';
import type { ServerContext } from '../server.js';
import type {
  MemoryQueryFilter,
  MemoryType,
  MemoryStatus,
} from '@mnemo/core';

/**
 * Memory 路由
 *
 * GET  /api/memory         — 查询记忆图（支持过滤）
 * GET  /api/memory/:id     — 获取单个记忆详情
 * GET  /api/memory/:id/graph — 获取以某记忆为中心的子图
 * POST /api/memory         — 手动保存记忆
 * GET  /api/memory/stats   — 记忆统计
 */
export function registerMemoryRoutes(app: FastifyInstance, ctx: ServerContext) {
  // 查询记忆图
  app.get('/api/memory', async (request) => {
    const query = request.query as Partial<{
      type: MemoryType;
      status: MemoryStatus;
      minImportance: string;
      limit: string;
      offset: string;
    }>;

    const filter: MemoryQueryFilter = {};
    if (query.type) filter.type = query.type;
    if (query.status) filter.status = query.status;
    if (query.minImportance) filter.minImportance = Number(query.minImportance);
    if (query.limit) filter.limit = Number(query.limit);

    return ctx.store.getGraph(filter);
  });

  // 记忆统计
  app.get('/api/memory/stats', async () => {
    const count = await ctx.store.count();
    const graph = await ctx.store.getGraph({ limit: 1000 });
    const byType = {
      episodic: graph.nodes.filter((n) => n.type === 'episodic').length,
      semantic: graph.nodes.filter((n) => n.type === 'semantic').length,
      procedural: graph.nodes.filter((n) => n.type === 'procedural').length,
    };
    return { total: count, byType, edges: graph.edges.length };
  });

  // 获取单个记忆
  app.get('/api/memory/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const memory = await ctx.store.getMemory(id);
    if (!memory) return reply.code(404).send({ error: 'Memory not found' });
    const edges = await ctx.store.getEdges(id);
    return { memory, edges };
  });

  // 获取以某记忆为中心的子图
  app.get('/api/memory/:id/graph', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { depth } = request.query as { depth?: string };
    return ctx.store.getGraphAround(id, Number(depth ?? 2));
  });

  // 手动保存记忆
  app.post('/api/memory', async (request, reply) => {
    const body = request.body as {
      type?: MemoryType;
      content?: string;
      summary?: string;
      importance?: number;
    };
    if (!body.content || !body.type) {
      return reply.code(400).send({ error: 'type and content are required' });
    }

    // 生成 embedding
    const [embedding] = await ctx.llm.embed([body.summary ?? body.content]);
    const node = await ctx.store.createMemory({
      type: body.type,
      content: body.content,
      summary: body.summary ?? body.content.slice(0, 50),
      importance: body.importance ?? 0.5,
      embedding,
    });
    return node;
  });
}
