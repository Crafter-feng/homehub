import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './db/database.module';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FamiliesModule } from './modules/families/families.module';
import { StockModule } from './modules/stock/stock.module';
import { MasterDataModule } from './modules/master-data/master-data.module';
import { ListsModule } from './modules/lists/lists.module';
import { RecipesModule } from './modules/recipes/recipes.module';
import { MealPlansModule } from './modules/meal-plans/meal-plans.module';
import { TriggerModule } from './modules/trigger/trigger.module';
import { ScannerModule } from './modules/scanner/scanner.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { EncoderModule } from './modules/codes/encoder/encoder.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { McpModule } from './modules/mcp/mcp.module';
import { PluginsModule } from './plugins/plugins.module';
import { PluginRegistryService } from './plugins/registry/plugin-registry.service';
import { builtinPlugins } from './plugins/built-in';
import { IotTagsModule } from './modules/iot-tags/iot-tags.module';
import { HardwareModule } from './modules/hardware/hardware.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { HistoryModule } from './modules/history/history.module';
import { AdminModule } from './modules/admin/admin.module';
import { BudgetModule } from './modules/budget/budget.module';
import { BackupModule } from './modules/backup/backup.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { ProductsModule } from './modules/products/products.module';
import { CustomFieldsModule } from './modules/custom-fields/custom-fields.module';

@Module({
  imports: [
    // ═══════════════════════════════════════════
    // 基础设施层 (Infrastructure)
    // ═══════════════════════════════════════════
    ConfigModule,
    DatabaseModule,

    // ═══════════════════════════════════════════
    // 核心业务层 (Core Business)
    // ═══════════════════════════════════════════
    AuthModule,
    UsersModule,
    FamiliesModule,
    StockModule,
    ProductsModule,     // 产品主数据
    MasterDataModule,   // 系统数据（位置/分类/标签/单位/品牌/商店）
    ListsModule,
    RecipesModule,
    MealPlansModule,    // 每周餐计划

    BudgetModule,       // 预算/记账
    CalendarModule,     // 日历事件

    // ═══════════════════════════════════════════
    // 扫描/编码层 (Scanner/Encoder)
    // ═══════════════════════════════════════════
    ScannerModule,      // 扫描/识别（barcode/QR/NFC/RFID）
    EncoderModule,      // 条码/二维码生成

    // ═══════════════════════════════════════════
    // 扩展功能层 (Extensions)
    // ═══════════════════════════════════════════
    TriggerModule,      // 触发器/自动化
    NotificationsModule,
    DashboardModule,

    // ═══════════════════════════════════════════
    // 集成层 (Integrations)
    // ═══════════════════════════════════════════
    McpModule,
    HardwareModule,
    IotTagsModule,

    // ═══════════════════════════════════════════
    // 系统层 (System)
    // ═══════════════════════════════════════════
    PluginsModule,
    DocumentsModule,
    HistoryModule,
    AdminModule,
    BackupModule,       // 备份/恢复
    CustomFieldsModule, // 自定义字段
  ],
  controllers: [HealthController],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly pluginRegistry: PluginRegistryService) {}

  async onModuleInit() {
    // 加载内置插件
    for (const plugin of builtinPlugins) {
      await this.pluginRegistry.load(plugin);
    }
  }
}
