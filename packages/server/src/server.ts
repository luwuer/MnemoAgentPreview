import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import {
  Neo4jMemoryStore,
  OpenAICompatibleProvider,
  MCPClient,
  ToolRegistry,
  SkillsLoader,
  SkillsMatcher,
  RulesLoader,
  MnemoAgent,
  LLMMemoryExtractor,
  registerMemoryTools,
  applyDecay,
  type MnemoConfig,
} from '@mnemo/core';
import { registerChatRoutes } from './routes/chat.js';
import { registerMemoryRoutes } from './routes/memory.js';
import { registerConfigRoutes } from './routes/config.js';
import { registerWSHandler } from './ws/handler.js';

export interface ServerContext {
  config: MnemoConfig;
  store: Neo4jMemoryStore;
  agent: MnemoAgent;
  llm: OpenAICompatibleProvider;
  mcpClient: MCPClient;
}

/**
 * 创建并初始化 Fastify 服务
 *
 * 组装 core 依赖 → 注册路由与 WebSocket → 返回 Fastify 实例
 */
export async function createServer(config: MnemoConfig): Promise<{
  app: FastifyInstance;
  ctx: ServerContext;
}> {
  // 1. 初始化记忆存储
  const store = new Neo4jMemoryStore({
    url: config.neo4j.url,
    username: config.neo4j.username,
    password: config.neo4j.password,
    database: config.neo4j.database,
  });
  await store.init();

  // 2. 初始化 LLM Provider
  const llm = new OpenAICompatibleProvider({
    baseURL: config.llm.baseURL,
    apiKey: config.llm.apiKey,
    model: config.llm.model,
    embeddingModel: config.llm.embeddingModel,
    temperature: config.llm.temperature,
    maxTokens: config.llm.maxTokens,
  });

  // 3. 初始化 MCP 客户端
  const mcpClient = new MCPClient(config.mcpServers);
  await mcpClient.init();

  // 4. 工具注册表
  const toolRegistry = new ToolRegistry();
  registerMemoryTools(toolRegistry, store, llm);
  toolRegistry.setMCPClient(mcpClient);
  await toolRegistry.loadMCPTools();

  // 5. Skills + Rules
  const skillsLoader = new SkillsLoader(
    config.skills.directory,
    config.skills.enabled
  );
  const skillsMatcher = new SkillsMatcher(skillsLoader.load());
  const rulesLoader = new RulesLoader(
    config.rules.globalRulesPath,
    config.rules.projectRules
  );

  // 6. 记忆提取器
  const extractor = new LLMMemoryExtractor(llm);

  // 7. Agent
  const agent = new MnemoAgent({
    llm,
    store,
    embedder: llm,
    extractor,
    skillsMatcher,
    rulesLoader,
    toolRegistry,
    recallConfig: config.memory.recall,
    consolidationConfig: config.memory.consolidation,
  });

  // 8. 定期执行记忆衰减（每小时）
  const decayInterval = setInterval(() => {
    applyDecay(store, config.memory.decay).catch((e) =>
      console.error('[mnemo] 衰减任务失败:', e)
    );
  }, 3600_000);

  // 9. 创建 Fastify
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  await app.register(websocket);

  const ctx: ServerContext = { config, store, agent, llm, mcpClient };

  // 10. 注册路由
  await registerChatRoutes(app, ctx);
  await registerMemoryRoutes(app, ctx);
  await registerConfigRoutes(app, ctx);
  await registerWSHandler(app, ctx);

  // 清理
  app.addHook('onClose', async () => {
    clearInterval(decayInterval);
    await mcpClient.close();
    await store.close();
  });

  return { app, ctx };
}
