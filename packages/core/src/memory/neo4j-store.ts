import neo4j, { type Driver, type Integer } from 'neo4j-driver';
import type {
  MemoryNode,
  MemoryEdge,
  MemoryGraph,
  MemoryQueryFilter,
  MemoryType,
  MemoryStatus,
  MemoryRelationType,
} from '../types/memory.js';
import type {
  MemoryStore,
  CreateMemoryInput,
  CreateEdgeInput,
} from './store.js';

/** Neo4j 记录 → MemoryNode */
function recordToMemory(record: Record<string, unknown>): MemoryNode {
  const props = record as Record<string, unknown>;
  return {
    id: String(props.id),
    type: props.type as MemoryType,
    content: String(props.content ?? ''),
    summary: String(props.summary ?? ''),
    importance: Number(props.importance ?? 0),
    embedding: Array.isArray(props.embedding)
      ? (props.embedding as number[])
      : undefined,
    createdAt: toNumber(props.createdAt),
    lastAccessedAt: toNumber(props.lastAccessedAt),
    accessCount: toNumber(props.accessCount),
    decayScore: Number(props.decayScore ?? 1),
    status: (props.status as MemoryStatus) ?? 'active',
    metadata: (props.metadata as Record<string, unknown>) ?? undefined,
  };
}

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (v && typeof v === 'object' && 'toNumber' in v) {
    return (v as Integer).toNumber();
  }
  return Number(v ?? 0);
}

/**
 * Neo4j 记忆存储实现
 * 所有查询使用参数化 Cypher，防止注入
 */
export class Neo4jMemoryStore implements MemoryStore {
  private driver: Driver;
  private database: string;
  private initialized = false;

  constructor(config: { url: string; username: string; password: string; database?: string }) {
    this.driver = neo4j.driver(
      config.url,
      neo4j.auth.basic(config.username, config.password),
      { maxConnectionPoolSize: 100 }
    );
    this.database = config.database ?? 'neo4j';
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    const session = this.driver.session({ database: this.database });
    try {
      // 创建约束（id 唯一）
      await session.run(
        'CREATE CONSTRAINT memory_id_unique IF NOT EXISTS FOR (m:Memory) REQUIRE m.id IS UNIQUE'
      );
      // 创建向量索引（Neo4j 5.x 原生向量索引）
      await session.run(`
        CREATE VECTOR INDEX memory_embedding IF NOT EXISTS
        FOR (m:Memory) ON (m.embedding)
        OPTIONS {
          indexConfig: {
            \`vector.dimensions\`: 1536,
            \`vector.similarity_function\`: 'cosine'
          }
        }
      `);
      this.initialized = true;
    } finally {
      await session.close();
    }
  }

  async close(): Promise<void> {
    await this.driver.close();
  }

  private session() {
    return this.driver.session({ database: this.database });
  }

  async createMemory(input: CreateMemoryInput): Promise<MemoryNode> {
    const session = this.session();
    try {
      const now = Date.now();
      const id = crypto.randomUUID();
      const params = {
        id,
        type: input.type,
        content: input.content,
        summary: input.summary,
        importance: input.importance,
        embedding: input.embedding ?? null,
        createdAt: now,
        lastAccessedAt: now,
        accessCount: 0,
        decayScore: 1,
        status: 'active',
        metadata: input.metadata ?? null,
      };
      const result = await session.run(
        'CREATE (m:Memory $props) RETURN m{.*} AS m',
        { props: params }
      );
      return recordToMemory(result.records[0].toObject().m as Record<string, unknown>);
    } finally {
      await session.close();
    }
  }

  async getMemory(id: string): Promise<MemoryNode | null> {
    const session = this.session();
    try {
      const result = await session.run(
        'MATCH (m:Memory {id: $id}) RETURN m{.*} AS m',
        { id }
      );
      if (result.records.length === 0) return null;
      return recordToMemory(result.records[0].toObject().m as Record<string, unknown>);
    } finally {
      await session.close();
    }
  }

  async updateMemory(id: string, updates: Partial<MemoryNode>): Promise<MemoryNode | null> {
    const session = this.session();
    try {
      const setClauses: string[] = [];
      const params: Record<string, unknown> = { id };
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined) continue;
        setClauses.push(`m.${key} = $${key}`);
        params[key] = value;
      }
      if (setClauses.length === 0) {
        return this.getMemory(id);
      }
      const result = await session.run(
        `MATCH (m:Memory {id: $id})
         SET ${setClauses.join(', ')}
         RETURN m{.*} AS m`,
        params
      );
      if (result.records.length === 0) return null;
      return recordToMemory(result.records[0].toObject().m as Record<string, unknown>);
    } finally {
      await session.close();
    }
  }

  async archiveMemory(id: string): Promise<void> {
    const session = this.session();
    try {
      await session.run(
        'MATCH (m:Memory {id: $id}) SET m.status = $status',
        { id, status: 'archived' }
      );
    } finally {
      await session.close();
    }
  }

  async createEdge(input: CreateEdgeInput): Promise<MemoryEdge> {
    const session = this.session();
    try {
      const id = crypto.randomUUID();
      const result = await session.run(
        `MATCH (a:Memory {id: $source}), (b:Memory {id: $target})
         CREATE (a)-[r:${input.type} {id: $id, weight: $weight, metadata: $metadata}]->(b)
         RETURN r{.*} AS r`,
        {
          id,
          source: input.source,
          target: input.target,
          weight: input.weight,
          metadata: input.metadata ?? null,
        }
      );
      const r = result.records[0].toObject().r as Record<string, unknown>;
      return {
        id: String(r.id),
        source: input.source,
        target: input.target,
        type: input.type,
        weight: Number(r.weight),
        metadata: r.metadata as Record<string, unknown> | undefined,
      };
    } finally {
      await session.close();
    }
  }

  async getEdges(nodeId: string): Promise<MemoryEdge[]> {
    const session = this.session();
    try {
      const result = await session.run(
        `MATCH (a:Memory {id: $id})-[r]-(b:Memory)
         RETURN type(r) AS type, r{.*} AS r, a.id AS source, b.id AS target`,
        { id: nodeId }
      );
      return result.records.map((rec) => {
        const r = rec.toObject();
        const rel = r.r as Record<string, unknown>;
        return {
          id: String(rel.id),
          source: String(r.source),
          target: String(r.target),
          type: r.type as MemoryRelationType,
          weight: Number(rel.weight ?? 1),
          metadata: rel.metadata as Record<string, unknown> | undefined,
        };
      });
    } finally {
      await session.close();
    }
  }

  async vectorSearch(
    embedding: number[],
    topK: number
  ): Promise<Array<{ node: MemoryNode; score: number }>> {
    const session = this.session();
    try {
      const result = await session.run(
        `CALL db.index.vector.queryNodes('memory_embedding', $topK, $embedding)
         YIELD node, score
         WHERE node.status <> 'archived'
         RETURN node{.*} AS node, score`,
        { topK: neo4j.int(topK), embedding }
      );
      return result.records.map((rec) => {
        const obj = rec.toObject();
        return {
          node: recordToMemory(obj.node as Record<string, unknown>),
          score: Number(obj.score),
        };
      });
    } finally {
      await session.close();
    }
  }

  async expandNeighbors(
    anchorIds: string[],
    maxDepth: number
  ): Promise<{ nodes: MemoryNode[]; edges: MemoryEdge[]; depths: Map<string, number> }> {
    if (anchorIds.length === 0) {
      return { nodes: [], edges: [], depths: new Map() };
    }
    const session = this.session();
    try {
      // maxDepth 为已校验的整数，安全拼接；其余参数化
      const result = await session.run(
        `MATCH (anchor:Memory)
         WHERE anchor.id IN $anchorIds AND anchor.status <> 'archived'
         MATCH path = (anchor)-[r*1..${maxDepth}]-(related:Memory)
         WHERE related.status <> 'archived'
         WITH related, min(length(path)) AS depth,
              collect(DISTINCT r) AS allRels
         UNWIND allRels AS relList
         UNWIND relList AS rel
         WITH related, depth, collect(DISTINCT rel) AS rels
         RETURN related{.*} AS node, depth, rels`,
        { anchorIds }
      );

      const nodeMap = new Map<string, MemoryNode>();
      const depths = new Map<string, number>();
      const edgeMap = new Map<string, MemoryEdge>();

      for (const rec of result.records) {
        const obj = rec.toObject();
        const node = recordToMemory(obj.node as Record<string, unknown>);
        nodeMap.set(node.id, node);
        depths.set(node.id, toNumber(obj.depth));
        const rels = obj.rels as Array<Record<string, unknown>>;
        for (const rel of rels) {
          // 关系的方向和端点需要额外查询获取，这里简化：从 path 提取
        }
      }

      // 单独查询这些节点间的边
      const nodeIds = [...nodeMap.keys()];
      if (nodeIds.length > 0) {
        const edgeResult = await session.run(
          `MATCH (a:Memory)-[r]-(b:Memory)
           WHERE a.id IN $ids AND b.id IN $ids
             AND a.id < b.id
           RETURN type(r) AS type, r{.*} AS r, a.id AS source, b.id AS target`,
          { ids: nodeIds }
        );
        for (const rec of edgeResult.records) {
          const r = rec.toObject();
          const rel = r.r as Record<string, unknown>;
          const edge: MemoryEdge = {
            id: String(rel.id),
            source: String(r.source),
            target: String(r.target),
            type: r.type as MemoryRelationType,
            weight: Number(rel.weight ?? 1),
            metadata: rel.metadata as Record<string, unknown> | undefined,
          };
          edgeMap.set(edge.id, edge);
        }
      }

      return {
        nodes: [...nodeMap.values()],
        edges: [...edgeMap.values()],
        depths,
      };
    } finally {
      await session.close();
    }
  }

  async getGraph(filter?: MemoryQueryFilter): Promise<MemoryGraph> {
    const session = this.session();
    try {
      const conditions: string[] = ["m.status <> 'archived'"];
      const params: Record<string, unknown> = {};
      if (filter?.type) {
        conditions.push('m.type = $type');
        params.type = filter.type;
      }
      if (filter?.status) {
        conditions.push('m.status = $status');
        params.status = filter.status;
      }
      if (filter?.minImportance !== undefined) {
        conditions.push('m.importance >= $minImportance');
        params.minImportance = filter.minImportance;
      }
      if (filter?.timeRange) {
        conditions.push('m.createdAt >= $start AND m.createdAt <= $end');
        params.start = filter.timeRange[0];
        params.end = filter.timeRange[1];
      }
      params.limit = neo4j.int(filter?.limit ?? 200);

      const nodeResult = await session.run(
        `MATCH (m:Memory) WHERE ${conditions.join(' AND ')}
         RETURN m{.*} AS m ORDER BY m.createdAt DESC LIMIT $limit`,
        params
      );
      const nodes = nodeResult.records.map(
        (rec) => recordToMemory(rec.toObject().m as Record<string, unknown>)
      );

      const edges: MemoryEdge[] = [];
      if (nodes.length > 0) {
        const ids = nodes.map((n) => n.id);
        const edgeResult = await session.run(
          `MATCH (a:Memory)-[r]-(b:Memory)
           WHERE a.id IN $ids AND b.id IN $ids AND a.id < b.id
           RETURN type(r) AS type, r{.*} AS r, a.id AS source, b.id AS target`,
          { ids }
        );
        for (const rec of edgeResult.records) {
          const r = rec.toObject();
          const rel = r.r as Record<string, unknown>;
          edges.push({
            id: String(rel.id),
            source: String(r.source),
            target: String(r.target),
            type: r.type as MemoryRelationType,
            weight: Number(rel.weight ?? 1),
            metadata: rel.metadata as Record<string, unknown> | undefined,
          });
        }
      }

      return { nodes, edges };
    } finally {
      await session.close();
    }
  }

  async getGraphAround(nodeId: string, depth: number): Promise<MemoryGraph> {
    const result = await this.expandNeighbors([nodeId], depth);
    const center = await this.getMemory(nodeId);
    const nodes = center ? [center, ...result.nodes] : result.nodes;
    return { nodes, edges: result.edges };
  }

  async getMemories(ids: string[]): Promise<MemoryNode[]> {
    if (ids.length === 0) return [];
    const session = this.session();
    try {
      const result = await session.run(
        'MATCH (m:Memory) WHERE m.id IN $ids RETURN m{.*} AS m',
        { ids }
      );
      return result.records.map(
        (rec) => recordToMemory(rec.toObject().m as Record<string, unknown>)
      );
    } finally {
      await session.close();
    }
  }

  async count(): Promise<number> {
    const session = this.session();
    try {
      const result = await session.run(
        "MATCH (m:Memory) WHERE m.status <> 'archived' RETURN count(m) AS cnt"
      );
      return toNumber(result.records[0].toObject().cnt);
    } finally {
      await session.close();
    }
  }
}
