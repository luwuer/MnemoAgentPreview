import type {
  MemoryNode,
  MemoryEdge,
  MemoryGraph,
  MemoryQueryFilter,
} from '../types/memory.js';

/**
 * 记忆存储抽象接口
 * 定义记忆节点/边的 CRUD、向量检索、多跳图查询能力
 */
export interface MemoryStore {
  /** 初始化（建索引等） */
  init(): Promise<void>;
  /** 关闭连接 */
  close(): Promise<void>;

  /** 创建记忆节点 */
  createMemory(
    input: CreateMemoryInput
  ): Promise<MemoryNode>;

  /** 获取单个记忆 */
  getMemory(id: string): Promise<MemoryNode | null>;

  /** 更新记忆 */
  updateMemory(id: string, updates: Partial<MemoryNode>): Promise<MemoryNode | null>;

  /** 归档记忆（软删除，不物理删除） */
  archiveMemory(id: string): Promise<void>;

  /** 创建关联边 */
  createEdge(input: CreateEdgeInput): Promise<MemoryEdge>;

  /** 获取节点的所有关联边 */
  getEdges(nodeId: string): Promise<MemoryEdge[]>;

  /** 向量检索（语义锚点定位） */
  vectorSearch(
    embedding: number[],
    topK: number
  ): Promise<Array<{ node: MemoryNode; score: number }>>;

  /** 多跳图展开（BFS，从锚点出发） */
  expandNeighbors(
    anchorIds: string[],
    maxDepth: number
  ): Promise<{ nodes: MemoryNode[]; edges: MemoryEdge[]; depths: Map<string, number> }>;

  /** 获取记忆图（前端可视化） */
  getGraph(filter?: MemoryQueryFilter): Promise<MemoryGraph>;

  /** 获取以某节点为中心的子图 */
  getGraphAround(nodeId: string, depth: number): Promise<MemoryGraph>;

  /** 批量获取记忆 */
  getMemories(ids: string[]): Promise<MemoryNode[]>;

  /** 记忆总数 */
  count(): Promise<number>;
}

export interface CreateMemoryInput {
  type: MemoryNode['type'];
  content: string;
  summary: string;
  importance: number;
  embedding?: number[];
  metadata?: Record<string, unknown>;
}

export interface CreateEdgeInput {
  source: string;
  target: string;
  type: MemoryEdge['type'];
  weight: number;
  metadata?: Record<string, unknown>;
}
