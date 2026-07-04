import { HomeHubPlugin, HomeHubPluginMeta, TriggerActionPluginExports } from '../../types/plugin.types';

// === In-App Notification (App内通知) ===
const notificationExports: TriggerActionPluginExports = {
  type: 'notification',
  name: 'App 内通知',
  async execute(config, context) {
    const { title, message, type } = config;
    context.eventBus.emit('notification:new', {
      title: title || '通知',
      message: message || '',
      type: type || 'system',
      userId: context.userId,
      familyId: context.familyId,
    });
    return { success: true };
  },
};

const notificationMeta: HomeHubPluginMeta = {
  id: 'builtin.trigger-actions.notification',
  name: 'Trigger Action: App内通知',
  version: '1.0.0',
  description: 'App内通知触发动作',
  author: 'HomeHub Team',
  extensionPoints: ['trigger-action'],
};

export const NotificationTriggerPlugin: HomeHubPlugin = {
  meta: notificationMeta,
  exports: notificationExports,
  async onLoad(ctx) {
    ctx.logger.info(`App内通知 TriggerAction 插件加载完成 (type: notification)`);
  },
  async onUnload(ctx) {
    ctx.logger.info('App内通知 TriggerAction 插件已卸载');
  },
};

// === Webhook (Webhook推送) ===
const webhookExports: TriggerActionPluginExports = {
  type: 'webhook',
  name: 'Webhook 推送',
  async execute(config, context) {
    const { url, method, headers, body } = config;
    try {
      const response = await fetch(url, {
        method: method || 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body || {}),
        signal: AbortSignal.timeout(10000),
      });
      return { success: response.ok, status: response.status };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
};

const webhookMeta: HomeHubPluginMeta = {
  id: 'builtin.trigger-actions.webhook',
  name: 'Trigger Action: Webhook推送',
  version: '1.0.0',
  description: 'Webhook推送触发动作',
  author: 'HomeHub Team',
  extensionPoints: ['trigger-action'],
};

export const WebhookTriggerPlugin: HomeHubPlugin = {
  meta: webhookMeta,
  exports: webhookExports,
  async onLoad(ctx) {
    ctx.logger.info(`Webhook TriggerAction 插件加载完成 (type: webhook)`);
  },
  async onUnload(ctx) {
    ctx.logger.info('Webhook TriggerAction 插件已卸载');
  },
};

// === Open Page (打开页面) ===
const openPageExports: TriggerActionPluginExports = {
  type: 'open_page',
  name: '打开页面',
  async execute(config, context) {
    const { pageUrl } = config;
    return { success: true, action: 'navigate', url: pageUrl };
  },
};

const openPageMeta: HomeHubPluginMeta = {
  id: 'builtin.trigger-actions.open_page',
  name: 'Trigger Action: 打开页面',
  version: '1.0.0',
  description: '打开页面触发动作',
  author: 'HomeHub Team',
  extensionPoints: ['trigger-action'],
};

export const OpenPageTriggerPlugin: HomeHubPlugin = {
  meta: openPageMeta,
  exports: openPageExports,
  async onLoad(ctx) {
    ctx.logger.info(`打开页面 TriggerAction 插件加载完成 (type: open_page)`);
  },
  async onUnload(ctx) {
    ctx.logger.info('打开页面 TriggerAction 插件已卸载');
  },
};

// === MCP Tool Call (MCP工具调用) ===
const mcpToolExports: TriggerActionPluginExports = {
  type: 'mcp_tool',
  name: '调用 MCP 工具',
  async execute(config, context) {
    const { mcpToolName, mcpToolArgs } = config;
    return { success: true, tool: mcpToolName, args: mcpToolArgs };
  },
};

const mcpToolMeta: HomeHubPluginMeta = {
  id: 'builtin.trigger-actions.mcp_tool',
  name: 'Trigger Action: MCP工具调用',
  version: '1.0.0',
  description: 'MCP工具调用触发动作',
  author: 'HomeHub Team',
  extensionPoints: ['trigger-action'],
};

export const McpToolTriggerPlugin: HomeHubPlugin = {
  meta: mcpToolMeta,
  exports: mcpToolExports,
  async onLoad(ctx) {
    ctx.logger.info(`MCP工具调用 TriggerAction 插件加载完成 (type: mcp_tool)`);
  },
  async onUnload(ctx) {
    ctx.logger.info('MCP工具调用 TriggerAction 插件已卸载');
  },
};

// === All TriggerAction plugins (for bulk import) ===
export const allTriggerActionPlugins: HomeHubPlugin[] = [
  NotificationTriggerPlugin,
  WebhookTriggerPlugin,
  OpenPageTriggerPlugin,
  McpToolTriggerPlugin,
];
