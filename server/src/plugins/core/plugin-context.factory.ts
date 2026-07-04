import { Injectable, Inject, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { DATABASE_TOKEN } from '../../db/database.module';
import { EventBusService } from './event-bus.service';
import { PluginStorageService } from './plugin-storage.service';
import { PluginRegistryService } from '../registry/plugin-registry.service';
import { PluginContext } from '../types/plugin.types';

/**
 * Factory service that creates fully-injected PluginContext instances.
 *
 * Replaces the previous inline mock in PluginRegistryService.createContext()
 * with real NestJS DI-injected providers:
 * - Database connection (via DATABASE_TOKEN)
 * - ConfigService (real NestJS-backed config)
 * - EventBusService (real event bus)
 * - PluginStorageService.forPlugin() (DB-persisted scoped storage)
 * - PluginRegistryService (real registry reference)
 * - NestJS Logger with [Plugin:id] prefix (info→log mapped for backward compat)
 *
 * Note: db instance typed as `any` to avoid Drizzle ORM union-type method call
 * incompatibility (BetterSQLite3Database | NodePgDatabase). The PluginContext
 * interface still uses `Database` for proper type documentation.
 */
@Injectable()
export class PluginContextFactory {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
    private readonly configService: ConfigService,
    private readonly eventBus: EventBusService,
    private readonly storage: PluginStorageService,
    @Inject(forwardRef(() => PluginRegistryService))
    private readonly registry: PluginRegistryService,
  ) {}

  /**
   * Create a PluginContext for a given plugin.
   * All providers are injected via NestJS DI — no inline mocks.
   *
   * @param pluginId - The unique identifier of the plugin
   * @returns A fully-injected PluginContext instance
   */
  create(pluginId: string): PluginContext {
    // Create a NestJS Logger with plugin-scoped prefix.
    // Wrap it to expose `info()` as alias for `log()` for backward compatibility
    // with the previous PluginContext.logger contract.
    const nestLogger = new Logger(`Plugin:${pluginId}`);
    const pluginLogger = {
      info: (message: string) => nestLogger.log(message),
      warn: (message: string) => nestLogger.warn(message),
      error: (message: string) => nestLogger.error(message),
      debug: (message: string) => nestLogger.debug(message),
    };

    return {
      registry: this.registry,
      db: this.db,
      config: this.configService,
      logger: pluginLogger,
      eventBus: this.eventBus,
      storage: this.storage.forPlugin(pluginId),
    };
  }
}
