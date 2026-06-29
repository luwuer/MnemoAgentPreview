import type { MemoryStore } from '../memory/store.js';
import type { Embedder } from '../memory/recall.js';
import { progressiveRecall, formatRecallContext } from '../memory/recall.js';
import type { ToolRegistry, InternalTool } from '../mcp/registry.js';
import type { MemoryType } from '../types/memory.js';

/**
 * 注册记忆相关内置工具
 *
 * - memory_search: 搜索记忆库（渐进式召回）
 * - memory_save: 主动保存记忆
 */
export function registerMemoryTools(
  registry: ToolRegistry,
  store: MemoryStore,
  embedder: Embedder
): void {
  const searchTool: InternalTool = {
    definition: {
      type: 'function',
      function: {
        name: 'memory_search',
        description: '搜索记忆库中的相关记忆，返回按相关度排序的记忆列表。当需要回忆过去的对话、事实或用户偏好时使用。',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: '搜索查询文本',
            },
          },
          required: ['query'],
        },
      },
    },
    handler: async (args) => {
      const query = args.query as string;
      const recall = await progressiveRecall(query, store, embedder);
      return formatRecallContext(recall) || '未找到相关记忆';
    },
  };

  const saveTool: InternalTool = {
    definition: {
      type: 'function',
      function: {
        name: 'memory_save',
        description: '将一条信息主动保存为长期记忆。当用户明确要求"记住"某事，或识别到重要信息时使用。',
        parameters: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['episodic', 'semantic', 'procedural'],
              description: '记忆类型：episodic(事件)/semantic(知识)/procedural(流程)',
            },
            content: {
              type: 'string',
              description: '记忆的完整内容',
            },
            summary: {
              type: 'string',
              description: '记忆的简短摘要（一句话）',
            },
            importance: {
              type: 'number',
              description: '重要度 0-1，默认 0.5',
              minimum: 0,
              maximum: 1,
            },
          },
          required: ['type', 'content', 'summary'],
        },
      },
    },
    handler: async (args) => {
      const [embedding] = await embedder.embed([args.summary as string]);
      const node = await store.createMemory({
        type: args.type as MemoryType,
        content: args.content as string,
        summary: args.summary as string,
        importance: (args.importance as number) ?? 0.5,
        embedding,
      });
      return `已保存记忆 [${node.id}] (${node.type}): ${node.summary}`;
    },
  };

  registry.registerInternal(searchTool);
  registry.registerInternal(saveTool);
}
