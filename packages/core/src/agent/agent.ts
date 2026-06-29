import type { LLMProvider } from '../llm/provider.js';
import type { MemoryStore } from '../memory/store.js';
import {
  progressiveRecall,
  formatRecallContext,
  type Embedder,
} from '../memory/recall.js';
import {
  consolidateMemories,
  type MemoryExtractor,
} from '../memory/consolidation.js';
import type { SkillsMatcher } from '../skills/matcher.js';
import type { RulesLoader } from '../rules/loader.js';
import type { ToolRegistry } from '../mcp/registry.js';
import type {
  ChatMessage,
  AgentEvent,
  ToolCall,
} from '../types/agent.js';
import type {
  MemoryRecallConfig,
  MemoryConsolidationConfig,
} from '../config/schema.js';
import { buildSystemPrompt } from './prompt.js';

/** Agent 依赖 */
export interface AgentDeps {
  llm: LLMProvider;
  store: MemoryStore;
  embedder: Embedder;
  extractor: MemoryExtractor;
  skillsMatcher: SkillsMatcher;
  rulesLoader: RulesLoader;
  toolRegistry: ToolRegistry;
  recallConfig: Required<MemoryRecallConfig>;
  consolidationConfig: Required<MemoryConsolidationConfig>;
}

/** 流式 tool_calls 累积器 */
interface ToolCallAccumulator {
  id: string;
  name: string;
  arguments: string;
}

/**
 * Mnemo Agent — ReAct 主循环
 *
 * 流程：
 * 1. 渐进式召回相关记忆
 * 2. 匹配 Skills + 加载 Rules
 * 3. 构建系统提示词（记忆 + Skills + Rules + 工具）
 * 4. 流式调用 LLM
 * 5. 若有工具调用 → 执行 → 结果加入上下文 → 回到 4
 * 6. 响应完成 → 触发记忆固化（异步）
 */
export class MnemoAgent {
  private deps: AgentDeps;
  private sessionMessages = new Map<string, ChatMessage[]>();
  private sessionRounds = new Map<string, number>();

  constructor(deps: AgentDeps) {
    this.deps = deps;
  }

  /**
   * 对话主入口（AsyncGenerator 产出 AgentEvent）
   */
  async *chat(
    sessionId: string,
    userMessage: string
  ): AsyncGenerator<AgentEvent> {
    let messages = this.sessionMessages.get(sessionId) ?? [];

    // 1. 渐进式召回
    let recallContext = '';
    try {
      const recall = await progressiveRecall(
        userMessage,
        this.deps.store,
        this.deps.embedder,
        this.deps.recallConfig
      );
      if (recall.memories.length > 0) {
        recallContext = formatRecallContext(recall);
        yield {
          type: 'memory_recalled',
          anchors: recall.anchors,
          memoryIds: recall.memories.map((m) => m.id),
        };
      }
    } catch (e) {
      console.error('[mnemo] 记忆召回失败:', e);
    }

    // 2. 匹配 Skills + 加载 Rules
    const matchedSkills = this.deps.skillsMatcher.match(userMessage);
    const rules = this.deps.rulesLoader.load();
    const tools = this.deps.toolRegistry.getAllDefinitions();

    // 3. 构建系统提示词
    const systemPrompt = buildSystemPrompt({
      recallContext,
      skills: matchedSkills.map((s) => ({ name: s.name, content: s.content })),
      rulesText: this.deps.rulesLoader.formatRules(rules),
      tools,
    });

    if (messages.length === 0 || messages[0].role !== 'system') {
      messages.unshift({ role: 'system', content: systemPrompt });
    } else {
      messages[0] = { role: 'system', content: systemPrompt };
    }

    messages.push({ role: 'user', content: userMessage });

    // 4-5. ReAct 循环
    const maxRounds = 10;
    let round = 0;

    while (round < maxRounds) {
      round++;
      let assistantContent = '';
      const toolCallMap = new Map<number, ToolCallAccumulator>();
      let finishReason = 'stop';

      const stream = this.deps.llm.streamChat(messages, {
        tools: tools.length > 0 ? tools : undefined,
      });

      for await (const chunk of stream) {
        if (chunk.delta) {
          assistantContent += chunk.delta;
          yield { type: 'token', value: chunk.delta };
        }
        // 累积流式 tool_calls（按 index 聚合分片）
        if (chunk.toolCalls) {
          for (const tc of chunk.toolCalls as Array<
            ToolCall & { index?: number }
          >) {
            const idx = tc.index ?? 0;
            const acc = toolCallMap.get(idx) ?? {
              id: '',
              name: '',
              arguments: '',
            };
            if (tc.id) acc.id = tc.id;
            if (tc.function?.name) acc.name += tc.function.name;
            if (tc.function?.arguments) acc.arguments += tc.function.arguments;
            toolCallMap.set(idx, acc);
          }
        }
        if (chunk.finishReason) {
          finishReason = chunk.finishReason;
        }
      }

      const toolCalls = [...toolCallMap.values()].map((acc) => ({
        id: acc.id,
        type: 'function' as const,
        function: { name: acc.name, arguments: acc.arguments },
      }));

      messages.push({
        role: 'assistant',
        content: assistantContent,
        ...(toolCalls.length > 0 ? { toolCalls } : {}),
      });

      // 5. 执行工具调用
      if (toolCalls.length > 0 && finishReason === 'tool_calls') {
        for (const tc of toolCalls) {
          yield {
            type: 'tool_call',
            tool: tc.function.name,
            args: tc.function.arguments,
          };
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(tc.function.arguments || '{}');
          } catch {
            args = {};
          }
          const result = await this.deps.toolRegistry.callTool(
            tc.function.name,
            args
          );
          yield {
            type: 'tool_result',
            toolCallId: tc.id,
            result: result.content,
          };
          messages.push({
            role: 'tool',
            content: result.content,
            toolCallId: tc.id,
          });
        }
        continue;
      }

      break;
    }

    // 保存会话
    this.sessionMessages.set(sessionId, messages);
    const roundCount = (this.sessionRounds.get(sessionId) ?? 0) + 1;
    this.sessionRounds.set(sessionId, roundCount);

    // 6. 触发记忆固化（异步）
    if (
      this.deps.consolidationConfig.autoConsolidate &&
      roundCount >= this.deps.consolidationConfig.triggerRounds
    ) {
      this.consolidateSession(sessionId).catch((e) =>
        console.error('[mnemo] 记忆固化失败:', e)
      );
    }

    yield { type: 'done', sessionId };
  }

  private async consolidateSession(sessionId: string): Promise<void> {
    const messages = this.sessionMessages.get(sessionId) ?? [];
    const created = await consolidateMemories(
      messages.filter((m) => m.role !== 'system'),
      this.deps.store,
      this.deps.embedder,
      this.deps.extractor
    );
    if (created.length > 0) {
      console.log(`[mnemo] 会话 ${sessionId} 固化了 ${created.length} 条记忆`);
    }
  }

  /** 获取会话消息历史 */
  getSessionMessages(sessionId: string): ChatMessage[] {
    return this.sessionMessages.get(sessionId) ?? [];
  }

  /** 手动触发记忆固化 */
  async consolidate(sessionId: string): Promise<number> {
    const messages = this.sessionMessages.get(sessionId) ?? [];
    const created = await consolidateMemories(
      messages.filter((m) => m.role !== 'system'),
      this.deps.store,
      this.deps.embedder,
      this.deps.extractor
    );
    return created.length;
  }

  /** 清除会话 */
  clearSession(sessionId: string): void {
    this.sessionMessages.delete(sessionId);
    this.sessionRounds.delete(sessionId);
  }
}
