import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { StockModule } from '../stock/stock.module';
import { ListsModule } from '../lists/lists.module';
import { RecipesModule } from '../recipes/recipes.module';
import { TriggerModule } from '../trigger/trigger.module';
import { ScannerModule } from '../scanner/scanner.module';
import { MasterDataModule } from '../master-data/master-data.module';
import { MealPlansModule } from '../meal-plans/meal-plans.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { HistoryModule } from '../history/history.module';

/**
 * McpModule — MCP JSON-RPC 2.0 server module.
 *
 * Imports all modules whose services McpService dispatches to
 * for the generic callApi() proxy. No circular dependency exists:
 * none of these modules import McpModule.
 */
@Module({
  imports: [
    StockModule,
    ListsModule,
    RecipesModule,
    TriggerModule,
    ScannerModule,
    MasterDataModule,
    MealPlansModule,
    DashboardModule,
    NotificationsModule,
    HistoryModule,
  ],
  controllers: [McpController],
  providers: [McpService],
  exports: [McpService],
})
export class McpModule {}
