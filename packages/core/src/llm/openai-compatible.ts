import OpenAI from 'openai';
import type { LLMProvider } from './provider.js';
import type {
  ChatMessage,
  ChatOptions,
  ChatResponse,
  ChatChunk,
  ToolDefinition,
  ToolCall,
} from '../types/agent.js';
import type { Embedder } from '../memory/recall.js';

interface OpenAICompatibleConfig {
  baseURL: string;
  apiKey: string;
  model: string;
  embeddingModel: string;
  temperature: number;
  maxTokens: number;
}

/**
 * OpenAI 兼容 LLM 实现
 *
 * 通过 baseURL + apiKey 适配所有 OpenAI 兼容接口：
 * - DeepSeek: https://api.deepseek.com/v1
 * - 通义千问: https://dashscope.aliyuncs.com/compatible-mode/v1
 * - 智谱 GLM: https://open.bigmodel.cn/api/paas/v4
 */
export class OpenAICompatibleProvider implements LLMProvider, Embedder {
  private client: OpenAI;
  private model: string;
  private embeddingModel: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(config: OpenAICompatibleConfig) {
    this.client = new OpenAI({
      baseURL: config.baseURL,
      apiKey: config.apiKey || 'dummy',
    });
    this.model = config.model;
    this.embeddingModel = config.embeddingModel;
    this.defaultTemperature = config.temperature;
    this.defaultMaxTokens = config.maxTokens;
  }

  private mapMessages(messages: ChatMessage[]) {
    return messages.map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
      ...(m.toolCalls ? { tool_calls: m.toolCalls } : {}),
      ...(m.name ? { name: m.name } : {}),
    }));
  }

  private mapTools(tools?: ToolDefinition[]) {
    if (!tools || tools.length === 0) return undefined;
    return tools;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const completion = await this.client.chat.completions.create({
      model: options?.model ?? this.model,
      messages: this.mapMessages(messages) as any,
      temperature: options?.temperature ?? this.defaultTemperature,
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
      tools: this.mapTools(options?.tools),
      tool_choice: options?.toolChoice,
    });
    const choice = completion.choices[0];
    return {
      content: choice.message.content ?? '',
      toolCalls: choice.message.tool_calls as ToolCall[] | undefined,
      finishReason: choice.finish_reason ?? 'stop',
      usage: completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
            totalTokens: completion.usage.total_tokens,
          }
        : undefined,
    };
  }

  async *streamChat(
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncGenerator<ChatChunk> {
    const stream = await this.client.chat.completions.create({
      model: options?.model ?? this.model,
      messages: this.mapMessages(messages) as any,
      temperature: options?.temperature ?? this.defaultTemperature,
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
      tools: this.mapTools(options?.tools),
      tool_choice: options?.toolChoice,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;
      yield {
        delta: delta.content ?? undefined,
        toolCalls: delta.tool_calls as ToolCall[] | undefined,
        finishReason: chunk.choices[0]?.finish_reason ?? undefined,
      };
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: texts,
    });
    return response.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
  }
}
