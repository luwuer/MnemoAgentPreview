import { z } from 'zod';

/** LLM 提供商配置 */
export const LLMConfigSchema = z.object({
  provider: z.enum(['openai-compatible']).default('openai-compatible'),
  baseURL: z.string().url().default('https://api.deepseek.com/v1'),
  apiKey: z.string().default(''),
  model: z.string().default('deepseek-chat'),
  embeddingModel: z.string().default('text-embedding-v3'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().default(4096),
});

/** Neo4j 配置 */
export const Neo4jConfigSchema = z.object({
  url: z.string().default('bolt://localhost:7687'),
  username: z.string().default('neo4j'),
  password: z.string().default('mnemo_dev_password'),
  database: z.string().default('neo4j'),
});

/** MCP Server 配置 */
export const MCPServerConfigSchema = z.object({
  name: z.string(),
  enabled: z.boolean().default(true),
  transport: z.enum(['stdio', 'sse']),
  command: z.string().optional(),
  args: z.array(z.string()).default([]),
  env: z.record(z.string()).default({}),
  url: z.string().url().optional(),
});

/** Skill 配置 */
export const SkillsConfigSchema = z.object({
  directory: z.string().default('./skills'),
  enabled: z.array(z.string()).default([]),
});

/** Rules 配置 */
export const RulesConfigSchema = z.object({
  globalRulesPath: z.string().default('./config/rules'),
  projectRules: z.string().default(''),
});

/** 记忆系统配置 */
export const MemoryConfigSchema = z.object({
  recall: z
    .object({
      maxDepth: z.number().int().positive().default(3),
      maxNodes: z.number().int().positive().default(30),
      anchorCount: z.number().int().positive().default(5),
      minScore: z.number().min(0).max(1).default(0.1),
      hopDecay: z.number().min(0).max(1).default(0.6),
    })
    .default({}),
  consolidation: z
    .object({
      triggerRounds: z.number().int().positive().default(10),
      autoConsolidate: z.boolean().default(true),
    })
    .default({}),
  decay: z
    .object({
      lambda: z.number().positive().default(0.0001),
      decayThreshold: z.number().min(0).max(1).default(0.2),
      baseDecay: z.number().min(0).max(1).default(0.95),
    })
    .default({}),
});

/** Mnemo 完整配置 */
export const MnemoConfigSchema = z.object({
  llm: LLMConfigSchema.default({}),
  neo4j: Neo4jConfigSchema.default({}),
  mcpServers: z.array(MCPServerConfigSchema).default([]),
  skills: SkillsConfigSchema.default({}),
  rules: RulesConfigSchema.default({}),
  memory: MemoryConfigSchema.default({}),
});

export type LLMConfig = z.infer<typeof LLMConfigSchema>;
export type Neo4jConfig = z.infer<typeof Neo4jConfigSchema>;
export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;
export type SkillsConfig = z.infer<typeof SkillsConfigSchema>;
export type RulesConfig = z.infer<typeof RulesConfigSchema>;
export type MemoryRecallConfig = z.infer<
  typeof MemoryConfigSchema.shape.recall
>;
export type MemoryConsolidationConfig = z.infer<
  typeof MemoryConfigSchema.shape.consolidation
>;
export type MemoryDecayConfig = z.infer<typeof MemoryConfigSchema.shape.decay>;
export type MnemoConfig = z.infer<typeof MnemoConfigSchema>;
