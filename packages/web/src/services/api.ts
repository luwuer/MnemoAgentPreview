const BASE = '/api';

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`[api] ${url} failed:`, err);
    throw new Error(err || res.statusText);
  }
  return res.json() as Promise<T>;
}

/** 记忆图数据 */
export interface MemoryGraphData {
  nodes: Array<{
    id: string;
    type: 'episodic' | 'semantic' | 'procedural';
    content: string;
    summary: string;
    importance: number;
    createdAt: number;
    lastAccessedAt: number;
    accessCount: number;
    decayScore: number;
    status: 'active' | 'decayed' | 'archived';
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type: string;
    weight: number;
  }>;
}

/** 获取记忆图 */
export function getMemoryGraph(params?: Record<string, string>): Promise<MemoryGraphData> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request(`/memory${qs}`);
}

/** 获取记忆统计 */
export function getMemoryStats(): Promise<{
  total: number;
  byType: Record<string, number>;
  edges: number;
}> {
  return request('/memory/stats');
}

/** 获取记忆详情 */
export function getMemoryDetail(id: string): Promise<{ memory: any; edges: any[] }> {
  return request(`/memory/${id}`);
}

/** 获取记忆子图 */
export function getMemorySubgraph(id: string, depth = 2): Promise<MemoryGraphData> {
  return request(`/memory/${id}/graph?depth=${depth}`);
}

/** 保存记忆 */
export function saveMemory(body: {
  type: string;
  content: string;
  summary?: string;
  importance?: number;
}): Promise<any> {
  return request('/memory', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** 获取配置 */
export function getConfig(): Promise<any> {
  return request('/config');
}

/** 获取 LLM 模型列表 */
export function getLLMModels(): Promise<any> {
  return request('/config/llm-models');
}

/** 创建流式会话 */
export function createStreamSession(): Promise<{ sessionId: string; wsUrl: string }> {
  return request('/chat/stream', { method: 'POST', body: '{}' });
}

/** 获取会话消息 */
export function getSessionMessages(sessionId: string): Promise<{ sessionId: string; messages: any[] }> {
  return request(`/chat/${sessionId}/messages`);
}

/** 触发记忆固化 */
export function consolidate(sessionId: string): Promise<{ consolidated: number }> {
  return request(`/chat/${sessionId}/consolidate`, { method: 'POST', body: '{}' });
}
