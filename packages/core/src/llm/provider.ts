import type {
  ChatMessage,
  ChatOptions,
  ChatResponse,
  ChatChunk,
} from '../types/agent.js';

/**
 * LLM 提供商抽象接口
 * 抽象层使得可适配任何 OpenAI 兼容的 LLM 服务
 */
export interface LLMProvider {
  /** 非流式对话 */
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  /** 流式对话（AsyncGenerator 逐 token 产出） */
  streamChat(
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncGenerator<ChatChunk>;
  /** 生成嵌入向量 */
  embed(texts: string[]): Promise<number[][]>;
}
