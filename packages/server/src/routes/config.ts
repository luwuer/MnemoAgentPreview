import type { FastifyInstance } from 'fastify';
import type { ServerContext } from '../server.js';

/**
 * Config 路由
 *
 * GET /api/config  — 获取当前配置（脱敏）
 */
export function registerConfigRoutes(
  app: FastifyInstance,
  ctx: ServerContext
) {
  app.get('/api/config', async () => {
    const config = ctx.config;
    return {
      llm: {
        provider: config.llm.provider,
        baseURL: config.llm.baseURL,
        model: config.llm.model,
        embeddingModel: config.llm.embeddingModel,
        temperature: config.llm.temperature,
        maxTokens: config.llm.maxTokens,
        // apiKey 脱敏
        hasApiKey: Boolean(config.llm.apiKey),
      },
      neo4j: {
        url: config.neo4j.url,
        database: config.neo4j.database,
      },
      mcpServers: config.mcpServers.map((s) => ({
        name: s.name,
        enabled: s.enabled,
        transport: s.transport,
        command: s.command,
        url: s.url,
      })),
      skills: {
        directory: config.skills.directory,
        enabled: config.skills.enabled,
      },
      memory: config.memory,
    };
  });

  app.get('/api/config/llm-models', async () => {
    // 预设的国产模型选项
    return {
      providers: [
        {
          name: 'DeepSeek',
          baseURL: 'https://api.deepseek.com/v1',
          models: ['deepseek-chat', 'deepseek-reasoner'],
        },
        {
          name: '通义千问',
          baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          models: ['qwen-plus', 'qwen-turbo', 'qwen-max'],
        },
        {
          name: '智谱 GLM',
          baseURL: 'https://open.bigmodel.cn/api/paas/v4',
          models: ['glm-4', 'glm-4-flash', 'glm-4-air'],
        },
      ],
    };
  });
}
