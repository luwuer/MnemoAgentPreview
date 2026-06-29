/** Agent 事件类型（与服务端 AgentEvent 对应） */
export type AgentEvent =
  | { type: 'token'; value: string }
  | { type: 'tool_call'; tool: string; args: string }
  | { type: 'tool_result'; toolCallId: string; result: string }
  | { type: 'memory_recalled'; anchors: string[]; memoryIds: string[] }
  | { type: 'memory_created'; memory: { id: string; type: string; summary: string } }
  | { type: 'graph_update'; nodes: number; edges: number }
  | { type: 'done'; sessionId: string }
  | { type: 'error'; message: string }
  | { type: 'ping' };

/** 对话消息 */
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  /** 是否正在流式输出 */
  streaming?: boolean;
  /** 召回的记忆 ID */
  recalledMemoryIds?: string[];
  /** 工具调用记录 */
  toolCalls?: Array<{ tool: string; args: string; result?: string }>;
}
