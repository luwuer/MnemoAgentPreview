/**
 * Agent 通用类型定义
 */

/** 消息角色 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/** 对话消息 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
  /** 工具调用相关 */
  toolCallId?: string;
  toolCalls?: ToolCall[];
  name?: string;
  metadata?: Record<string, unknown>;
}

/** 工具调用 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/** 工具定义 */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/** 工具执行结果 */
export interface ToolResult {
  toolCallId: string;
  content: string;
  isError?: boolean;
}

/** 对话选项 */
export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'none' | 'required';
}

/** 对话响应 */
export interface ChatResponse {
  content: string;
  toolCalls?: ToolCall[];
  finishReason: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/** 流式对话块 */
export interface ChatChunk {
  delta?: string;
  toolCalls?: ToolCall[];
  finishReason?: string;
}

/** 会话 */
export interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

/** Agent 事件（流式推送到前端） */
export type AgentEvent =
  | { type: 'token'; value: string }
  | { type: 'tool_call'; tool: string; args: string }
  | { type: 'tool_result'; toolCallId: string; result: string }
  | { type: 'memory_recalled'; anchors: string[]; memoryIds: string[] }
  | { type: 'memory_created'; memory: { id: string; type: string; summary: string } }
  | { type: 'graph_update'; nodes: number; edges: number }
  | { type: 'done'; sessionId: string }
  | { type: 'error'; message: string };
