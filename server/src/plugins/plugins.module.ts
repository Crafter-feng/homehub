import { Module, Global } from '@nestjs/common';
import { PluginRegistryService } from './registry/plugin-registry.service';
import { EventBusService } from './core/event-bus.service';
import { PluginContextFactory } from './core/plugin-context.factory';
import { PluginStorageService } from './core/plugin-storage.service';
import { TriggerResolverService } from './core/trigger-resolver.service';
import { PluginsController } from './plugins.controller';
import { PluginsService } from './plugins.service';
import { DatabaseModule } from '../db/database.module';

@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [PluginsController],
  providers: [
    PluginRegistryService,
    EventBusService,
    PluginContextFactory,
    PluginStorageService,
    TriggerResolverService,
    PluginsService,
  ],
  exports: [
    PluginRegistryService,
    EventBusService,
    PluginContextFactory,
    PluginStorageService,
    TriggerResolverService,
    PluginsService,
  ],
})
export class PluginsModule {}
