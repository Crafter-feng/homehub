import { Controller, Post, Body, Headers, Get, HttpCode } from '@nestjs/common';
import { McpService } from './mcp.service';
import { PluginRegistryService } from '../../plugins/registry/plugin-registry.service';
import { McpToolExports } from '../../plugins/types/plugin.types';

/**
 * McpController — MCP JSON-RPC 2.0 endpoint.
 *
 * P-T03 refactoring:
 * - getToolsList(): dynamically collects MCP tools from PluginRegistryService
 *   instead of hardcoded tool definitions.
 * - executeTool(): finds the tool by name from Registry → delegates to
 *   McpService.callApi() for generic service proxy dispatch.
 *   No switch-case routing — tool name → Registry lookup → callApi.
 */
@Controller('mcp')
export class McpController {
  constructor(
    private readonly mcpService: McpService,
    private readonly registry: PluginRegistryService,
  ) {}

  // MCP 标准端点 - 处理所有 JSON-RPC 请求
  @Post()
  @HttpCode(200)
  async handleRequest(
    @Headers('authorization') auth: string,
    @Body() body: {
      jsonrpc: string;
      id: string | number;
      method: string;
      params?: Record<string, any>;
    },
  ) {
    // 验证 API Token
    const token = auth?.replace('Bearer ', '');
    if (!token) {
      return this.jsonrpcError(body.id, -32001, '缺少 API Token');
    }

    const user = await this.mcpService.validateToken(token);
    if (!user) {
      return this.jsonrpcError(body.id, -32001, '无效的 API Token');
    }

    // 路由到对应方法
    switch (body.method) {
      case 'initialize':
        return this.jsonrpcResult(body.id, {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'homehub',
            version: '1.0.0',
          },
        });

      case 'notifications/initialized':
        // 客户端确认初始化完成，无需响应
        return null;

      case 'tools/list':
        return this.jsonrpcResult(body.id, {
          tools: this.getToolsList(),
        });

      case 'tools/call':
        return this.handleToolCall(body.id, body.params, user);

      default:
        return this.jsonrpcError(body.id, -32601, `未知方法: ${body.method}`);
    }
  }

  // 健康检查
  @Get('health')
  health() {
    return { status: 'ok', protocol: 'mcp-jsonrpc-2.0' };
  }

  private async handleToolCall(id: string | number, params: any, user: any) {
    const { name, arguments: args } = params || {};

    if (!name) {
      return this.jsonrpcError(id, -32602, '缺少工具名称');
    }

    try {
      const result = await this.executeTool(name, args || {}, user.familyId, user.userId);
      return this.jsonrpcResult(id, {
        content: [{ type: 'text', text: JSON.stringify(result) }],
      });
    } catch (error: any) {
      return this.jsonrpcError(id, -32000, error.message);
    }
  }

  /**
   * Dynamically collect all MCP tool definitions from the Registry.
   * Replaces the previous hardcoded tool list.
   */
  private getToolsList() {
    const toolExports = this.registry.getPlugins<McpToolExports>('mcp-tool');

    return toolExports.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: this.buildInputSchema(tool.parameters),
    }));
  }

  /**
   * Execute a tool call by looking up the tool definition from the Registry
   * and delegating to McpService.callApi() for generic proxy dispatch.
   * Replaces the previous switch-case routing.
   */
  private async executeTool(name: string, args: Record<string, any>, familyId: number, userId: number) {
    // Find the tool definition from Registry
    const tool = this.registry.getPluginByType<McpToolExports>('mcp-tool', name);
    if (!tool) {
      throw new Error(`未知工具: ${name}`);
    }

    // Generic API proxy call — dispatches to the appropriate service
    return this.mcpService.callApi(tool.method, tool.apiPath, args, familyId, userId);
  }

  /**
   * Build MCP inputSchema from McpToolExports.parameters definition.
   */
  private buildInputSchema(parameters?: Record<string, {
    type: string;
    optional?: boolean;
    default?: any;
    enum?: string[];
    description?: string;
  }>) {
    if (!parameters) return { type: 'object', properties: {} };

    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, param] of Object.entries(parameters)) {
      properties[key] = {
        type: param.type === 'object' ? 'object' : param.type,
        description: param.description || '',
      };
      if (param.enum) properties[key].enum = param.enum;
      if (!param.optional) required.push(key);
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  private jsonrpcResult(id: string | number, result: any) {
    return {
      jsonrpc: '2.0',
      id,
      result,
    };
  }

  private jsonrpcError(id: string | number, code: number, message: string) {
    return {
      jsonrpc: '2.0',
      id,
      error: { code, message },
    };
  }
}
