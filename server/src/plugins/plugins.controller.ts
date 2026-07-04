import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PluginRegistryService } from './registry/plugin-registry.service';
import { EventBusService } from './core/event-bus.service';
import { PluginsService } from './plugins.service';

@Controller('plugins')
@UseGuards(JwtAuthGuard)
export class PluginsController {
  constructor(
    private readonly registry: PluginRegistryService,
    private readonly eventBus: EventBusService,
    private readonly pluginsService: PluginsService,
  ) {}

  /**
   * GET /plugins — 返回完整列表，包含每个 ItemType 插件的 exports.config
   */
  @Get()
  listPlugins() {
    return this.pluginsService.listPluginsWithExports();
  }

  /**
   * GET /plugins/item-type-configs/all — 返回所有 ItemType 配置的聚合接口
   * 注意：此路由必须在 :id 路由之前定义，否则 'item-type-configs' 会被当作 id 参数
   */
  @Get('item-type-configs/all')
  getItemTypeConfigs() {
    return this.pluginsService.getItemTypeConfigs();
  }

  /**
   * GET /plugins/state/summary — 返回当前所有插件运行状态摘要
   * 注意：此路由必须在 :id 路由之前定义，否则 'state' 会被当作 id 参数
   */
  @Get('state/summary')
  getPluginsState() {
    return this.pluginsService.getPluginsState();
  }

  @Get('events/:event')
  getEventListeners(@Param('event') event: string) {
    return { count: this.registry.listPlugins().length };
  }

  /**
   * GET /plugins/:id — 获取单个插件详情
   * 注意：动态参数路由必须在固定路径路由之后定义
   */
  @Get(':id')
  getPlugin(@Param('id') id: string) {
    const plugin = this.registry.getPlugin(id);
    if (!plugin) {
      return { error: 'Plugin not found' };
    }
    return {
      meta: plugin.meta,
      status: this.registry.isLoaded(id) ? 'active' : 'inactive',
    };
  }

  @Post(':id/enable')
  async enablePlugin(@Param('id') id: string) {
    const plugin = this.registry.getPlugin(id);
    if (!plugin) {
      return { error: 'Plugin not found' };
    }
    if (!this.registry.isLoaded(id)) {
      await this.registry.load(plugin);
    }
    return { success: true, status: 'active' };
  }

  @Post(':id/disable')
  async disablePlugin(@Param('id') id: string) {
    if (this.registry.isLoaded(id)) {
      await this.registry.unload(id);
    }
    return { success: true, status: 'inactive' };
  }

  /**
   * PUT /plugins/:id/config — 更新插件配置，存储到 PluginStorageService
   */
  @Put(':id/config')
  async updatePluginConfig(
    @Param('id') id: string,
    @Body() config: Record<string, unknown>,
  ) {
    return this.pluginsService.updatePluginConfig(id, config);
  }
}
