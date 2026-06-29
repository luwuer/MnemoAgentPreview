import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { MCPServerConfig } from '../config/schema.js';
import type { ToolResult } from '../types/agent.js';

/** MCP 工具描述 */
export interface MCPTool {
  server: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * MCP 客户端
 *
 * 管理多个 MCP Server 连接（stdio 子进程 + SSE 远程），
 * 提供统一的工具发现与调用接口
 */
export class MCPClient {
  private clients = new Map<string, Client>();
  private configs: MCPServerConfig[];

  constructor(configs: MCPServerConfig[]) {
    this.configs = configs.filter((c) => c.enabled);
  }

  /** 连接所有已配置的 MCP Server */
  async init(): Promise<void> {
    for (const config of this.configs) {
      try {
        const transport =
          config.transport === 'stdio'
            ? new StdioClientTransport({
                command: config.command!,
                args: config.args,
                env: { ...process.env, ...config.env } as Record<string, string>,
              })
            : new SSEClientTransport(new URL(config.url!));

        const client = new Client(
          { name: 'mnemo', version: '0.1.0' },
          { capabilities: {} }
        );
        await client.connect(transport);
        this.clients.set(config.name, client);
        console.log(`[mnemo] MCP Server 已连接: ${config.name}`);
      } catch (e) {
        console.error(`[mnemo] MCP Server ${config.name} 连接失败:`, e);
      }
    }
  }

  /** 列出所有 MCP Server 提供的工具 */
  async listTools(): Promise<MCPTool[]> {
    const allTools: MCPTool[] = [];
    for (const [server, client] of this.clients) {
      try {
        const { tools } = await client.listTools();
        for (const tool of tools) {
          allTools.push({
            server,
            name: tool.name,
            description: tool.description ?? '',
            inputSchema: (tool.inputSchema as Record<string, unknown>) ?? {
              type: 'object',
              properties: {},
            },
          });
        }
      } catch (e) {
        console.error(`[mnemo] 获取 MCP ${server} 工具列表失败:`, e);
      }
    }
    return allTools;
  }

  /** 调用 MCP 工具 */
  async callTool(
    server: string,
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const client = this.clients.get(server);
    if (!client) {
      return {
        toolCallId: '',
        content: `MCP Server "${server}" 未连接`,
        isError: true,
      };
    }
    try {
      const result = await client.callTool({ name, arguments: args });
      const content = Array.isArray(result.content)
        ? result.content
            .map((c: { text?: string }) => c.text ?? JSON.stringify(c))
            .join('\n')
        : JSON.stringify(result.content);
      return {
        toolCallId: '',
        content,
        isError: Boolean(result.isError),
      };
    } catch (e) {
      return {
        toolCallId: '',
        content: `MCP 工具调用失败: ${e}`,
        isError: true,
      };
    }
  }

  /** 关闭所有 MCP 连接 */
  async close(): Promise<void> {
    for (const client of this.clients.values()) {
      await client.close().catch(() => {});
    }
    this.clients.clear();
  }
}
