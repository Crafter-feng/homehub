#!/usr/bin/env node
// ═══════════════════════════════════════════════════════
// Grocy → HomeHub 数据迁移 CLI 工具
//
// 用法:
//   npx tsx scripts/migrate-grocy.ts --input ./grocy.db --family-id 1
//   npx tsx scripts/migrate-grocy.ts --input ./grocy.db --dry-run
// ═══════════════════════════════════════════════════════

import { resolve } from 'path';
import { existsSync } from 'fs';
import { migrateFromGrocy } from '../src/migration/migrate.service';

// ── 解析命令行参数 ──

function parseArgs(): {
  input: string;
  output?: string;
  familyId: number;
  dryRun: boolean;
  skipUsers: boolean;
  help: boolean;
} {
  const args = process.argv.slice(2);
  const result = {
    input: '',
    output: undefined as string | undefined,
    familyId: 1,
    dryRun: false,
    skipUsers: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--input':
      case '-i':
        result.input = args[++i];
        break;
      case '--output':
      case '-o':
        result.output = args[++i];
        break;
      case '--family-id':
      case '-f':
        result.familyId = parseInt(args[++i], 10) || 1;
        break;
      case '--dry-run':
        result.dryRun = true;
        break;
      case '--skip-users':
        result.skipUsers = true;
        break;
      case '--help':
      case '-h':
        result.help = true;
        break;
    }
  }

  return result;
}

function printHelp(): void {
  console.log(`
Grocy → HomeHub 数据迁移工具

用法:
  npx tsx scripts/migrate-grocy.ts --input <grocy.db> [选项]

必填参数:
  --input, -i <path>       Grocy SQLite 数据库文件路径

可选参数:
  --output, -o <path>      HomeHub SQLite 数据库文件路径 (默认: ./data/homehub.db)
  --family-id, -f <id>     HomeHub 家庭 ID (默认: 1)
  --dry-run                预检模式，不写入数据库
  --skip-users             跳过用户迁移
  --help, -h               显示帮助信息

示例:
  # 预检迁移（不写入）
  npx tsx scripts/migrate-grocy.ts -i ./grocy.db --dry-run

  # 执行迁移
  npx tsx scripts/migrate-grocy.ts -i ./grocy.db -f 1

  # 指定 HomeHub 数据库路径
  npx tsx scripts/migrate-grocy.ts -i ./grocy.db -o ./data/homehub.db

迁移映射:
  Grocy users           → HomeHub users
  Grocy locations       → HomeHub md_locations
  Grocy quantity_units  → HomeHub md_units
  Grocy products        → HomeHub inv_products + inv_items
  Grocy stock           → HomeHub inv_item_batches + inv_items.quantity
  Grocy stock_log       → HomeHub inv_stock_transactions
  Grocy shopping_list   → HomeHub hh_lists + hh_list_items
  Grocy recipes         → HomeHub hh_recipes
  Grocy chores          → HomeHub hh_lists(type=chore) + hh_list_items
`);
}

// ── 主函数 ──

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // 校验输入
  if (!args.input) {
    console.error('错误: 请指定 Grocy 数据库文件路径 (--input)');
    console.error('使用 --help 查看帮助');
    process.exit(1);
  }

  const inputPath = resolve(args.input);
  if (!existsSync(inputPath)) {
    console.error(`错误: 文件不存在 - ${inputPath}`);
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('  Grocy → HomeHub 数据迁移');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  输入: ${inputPath}`);
  if (args.output) {
    console.log(`  输出: ${resolve(args.output)}`);
  }
  console.log(`  家庭 ID: ${args.familyId}`);
  console.log(`  预检模式: ${args.dryRun ? '是' : '否'}`);
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    const report = await migrateFromGrocy({
      grocyDbPath: inputPath,
      homehubDbPath: args.output ? resolve(args.output) : undefined,
      familyId: args.familyId,
      dryRun: args.dryRun,
      skipUsers: args.skipUsers,
    });

    process.exit(report.success ? 0 : 1);
  } catch (error: any) {
    console.error(`\n迁移异常: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
