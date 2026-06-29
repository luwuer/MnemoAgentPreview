import type { ToolDefinition, ToolResult } from '../types/agent.js';
import type { MCPClient, MCPTool } from './client.js';

/** 内置工具处理器 */
export type ToolHandler = (args: Record<string, unknown>) => Promise<string>;

/** 内置工具定义 */
export interface InternalTool {
  definition: ToolDefinition;
  handler: ToolHandler;
}

/**
 * 工具注册表
 *
 * 聚合内置工具 + MCP 工具，提供统一的工具列表与调用入口。
 * MCP 工具命名规则：`{server}__{toolName}`，避免命名冲突
 */
export class ToolRegistry {
  private internal = new Map<string, InternalTool>();
  private mcpClient?: MCPClient;
  private mcpTools: MCPTool[] = [];

  /** 注册内置工具 */
  registerInternal(tool: InternalTool): void {
    this.internal.set(tool.definition.function.name, tool);
  }

  /** 设置 MCP 客户端 */
  setMCPClient(client: MCPClient): void {
    this.mcpClient = client;
  }

  /** 加载 MCP 工具列表 */
  async loadMCPTools(): Promise<void> {
    if (this.mcpClient) {
      this.mcpTools = await this.mcpClient.listTools();
    }
  }

  /** 获取所有工具定义（内置 + MCP） */
  getAllDefinitions(): ToolDefinition[] {
    const defs: ToolDefinition[] = [...this.internal.values()].map(
      (t) => t.definition
    );
    for (const tool of this.mcpTools) {
      defs.push({
        type: 'function',
        function: {
          name: `${tool.server}__${tool.name}`,
          description: `[${tool.server}] ${tool.description}`,
          parameters: tool.inputSchema,
        },
      });
    }
    return defs;
  }

  /** 调用工具（自动路由到内置或 MCP） */
  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    // 内置工具
    const internal = this.internal.get(name);
    if (internal) {
      try {
        const content = await internal.handler(args);
        return { toolCallId: '', content };
      } catch (e) {
        return {
          toolCallId: '',
          content: `工具执行失败: ${e}`,
          isError: true,
        };
      }
    }

    // MCP 工具（命名格式 server__toolName）
    const sepIndex = name.indexOf('__');
    if (sepIndex > 0 && this.mcpClient) {
      const server = name.slice(0, sepIndex);
      const toolName = name.slice(sepIndex + 2);
      return this.mcpClient.callTool(server, toolName, args);
    }

    return {
      toolCallId: '',
      content: `未知工具: ${name}`,
      isError: true,
    };
  }
}
