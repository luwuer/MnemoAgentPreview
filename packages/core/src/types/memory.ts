/**
 * 记忆系统类型定义
 * 参考认知科学的记忆分类，建模人类记忆机制
 */

/** 记忆类型 — 参考认知科学分类 */
export type MemoryType = 'episodic' | 'semantic' | 'procedural';

/** 记忆状态 */
export type MemoryStatus = 'active' | 'decayed' | 'archived';

/** 记忆关系类型 — 对应 Neo4j 关系边 */
export type MemoryRelationType =
  | 'TEMPORAL' // 时间顺承（A 发生在 B 之前）
  | 'CAUSAL' // 因果关系（A 导致 B）
  | 'SIMILAR' // 语义相似
  | 'PART_OF' // 层级从属（A 是 B 的一部分）
  | 'REFERENCES' // 引用关系
  | 'ASSOCIATIVE' // 联想关联（通用）
  | 'DERIVED_FROM'; // 派生关系（A 从 B 固化而来）

/** 记忆节点 — 对应 Neo4j Memory 节点 */
export interface MemoryNode {
  id: string;
  type: MemoryType;
  content: string;
  summary: string;
  /** 0-1, LLM 评估的重要性 */
  importance: number;
  /** 嵌入向量（用于语义检索锚点） */
  embedding?: number[];
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  /** 0-1, 艾宾浩斯衰减因子 */
  decayScore: number;
  status: MemoryStatus;
  metadata?: Record<string, unknown>;
}

/** 记忆关系边 — 对应 Neo4j 关系 */
export interface MemoryEdge {
  id: string;
  /** 源节点 ID */
  source: string;
  /** 目标节点 ID */
  target: string;
  type: MemoryRelationType;
  /** 关联强度 0-1 */
  weight: number;
  metadata?: Record<string, unknown>;
}

/** 渐进式召回结果 */
export interface RecallResult {
  /** 按评分降序排列的记忆节点 */
  memories: MemoryNode[];
  /** 召回记忆间的关联边 */
  edges: MemoryEdge[];
  /** nodeId → 召回评分 */
  scores: Map<string, number>;
  /** 锚点节点 ID */
  anchors: string[];
}

/** 记忆图视图（用于前端可视化） */
export interface MemoryGraph {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
}

/** 记忆查询过滤条件 */
export interface MemoryQueryFilter {
  type?: MemoryType;
  status?: MemoryStatus;
  minImportance?: number;
  /** 时间范围 [start, end] */
  timeRange?: [number, number];
  limit?: number;
  offset?: number;
}

/** 记忆类型颜色映射（供前端可视化使用） */
export const MEMORY_TYPE_COLORS: Record<MemoryType, string> = {
  episodic: '#3B82F6', // 蓝色
  semantic: '#10B981', // 绿色
  procedural: '#F59E0B', // 橙色
};

/** 关系类型颜色映射（供前端可视化使用） */
export const RELATION_TYPE_COLORS: Record<MemoryRelationType, string> = {
  TEMPORAL: '#8B5CF6',
  CAUSAL: '#EF4444',
  SIMILAR: '#06B6D4',
  PART_OF: '#F59E0B',
  REFERENCES: '#EC4899',
  ASSOCIATIVE: '#6366F1',
  DERIVED_FROM: '#A5B4FC',
};

/** 记忆类型中文标签 */
export const MEMORY_TYPE_LABELS: Record<MemoryType, string> = {
  episodic: '事件记忆',
  semantic: '知识记忆',
  procedural: '流程记忆',
};

/** 关系类型中文标签 */
export const RELATION_TYPE_LABELS: Record<MemoryRelationType, string> = {
  TEMPORAL: '时间顺承',
  CAUSAL: '因果关系',
  SIMILAR: '语义相似',
  PART_OF: '层级从属',
  REFERENCES: '引用',
  ASSOCIATIVE: '联想关联',
  DERIVED_FROM: '派生',
};
