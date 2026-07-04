import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { StockService } from './stock.service';
import { createTestModule } from '../../test/test-helper';

// Mock for PluginRegistryService
class MockRegistry {
  getPluginByType() { return null; }
  getItemTypeConfig() { return null; }
}

let module: any;
let service: StockService;

beforeAll(async () => {
  // We use a string token since importing the real class adds heavy deps
  const ctx = await createTestModule([
    StockService,
    { provide: 'PluginRegistryService', useClass: MockRegistry },
  ]);
  module = ctx.module;
  service = module.get(StockService);

  // Patch the registry after module init (since StockService injects by class token)
  // @ts-ignore - directly set the private property
  service['registry'] = new MockRegistry();
});

afterAll(() => {
  if (module) module.close();
});

describe('StockService', () => {
  let itemId: number;

  it('should create an item', async () => {
    const item = await service.create(1, {
      name: '测试物品',
      type: '食品',
      unit: '个',
      quantity: 10,
      brand: '品牌A',
      barcode: 'barcode-001',
    }, 1);
    expect(item.id).toBeTypeOf('number');
    expect(item.name).toBe('测试物品');
    expect(item.quantity).toBe(10);
    expect(item.familyId).toBe(1);
    itemId = item.id;
  });

  it('should list items', async () => {
    await service.create(1, { name: '物品B', type: '饮料' }, 1);
    const result = await service.list(1, {});
    expect(result.data.length).toBeGreaterThanOrEqual(2);
  });

  it('should search items', async () => {
    await service.create(1, { name: '可口可乐', type: '饮料' }, 1);
    await service.create(1, { name: '百事可乐', type: '饮料' }, 1);
    const result = await service.search(1, '可乐');
    expect(result.data.length).toBe(2);
  });

  it('should get item by id', async () => {
    const item = await service.getById(itemId);
    expect(item.id).toBe(itemId);
    expect(item.name).toBe('测试物品');
  });

  it('should stock-in with price update', async () => {
    const after = await service.stockIn(itemId, 1, 1, { quantity: 5, price: 20 });
    expect(after.lastPrice).toBe(20);
    expect(after.quantity).toBeGreaterThan(10);
  });

  it('should consume reducing quantity', async () => {
    const before = await service.getById(itemId);
    const after = await service.consume(itemId, 1, 1, { quantity: 3 });
    expect(after.quantity).toBe(before.quantity - 3);
  });

  it('should reject over-consumption', async () => {
    await expect(
      service.consume(itemId, 1, 1, { quantity: 999999 })
    ).rejects.toThrow('库存不足');
  });

  it('should transfer location', async () => {
    const after = await service.transfer(itemId, 1, 1, { toLocationId: 1 });
    expect(after.locationId).toBe(1);
  });

  it('should adjust to exact quantity', async () => {
    const after = await service.adjust(itemId, 1, 1, { quantity: 50 });
    expect(after.quantity).toBe(50);
  });

  it('should record transaction history', async () => {
    const history = await service.getHistory(itemId);
    expect(history.length).toBeGreaterThan(0);
    const types = history.map((h: any) => h.type);
    expect(types).toContain('add');
    expect(types).toContain('transfer');
    expect(types).toContain('adjust');
  });

  it('should find expiring items', async () => {
    // Read back all items with expiry dates to diagnose
    const items = await service.list(1, {});
    const expiryItems = items.data.filter((i: any) => i.expiryDate);
    const created = await service.create(1, { name: '将过期', type: '食品', expiryDate: Date.now() + 2 * 86400000 }, 1);
    const expiring = await service.getExpiring(1, 7);
    expect(expiring.length).toBeGreaterThanOrEqual(1);
  });

  it('should compute summary stats', async () => {
    const summary = await service.getSummary(1);
    expect(summary).toHaveProperty('totalItems');
    expect(summary.totalItems).toBeGreaterThan(0);
  });

  it('should delete an item', async () => {
    const item = await service.create(1, { name: '待删除' }, 1);
    await service.delete(item.id, 1);
    await expect(service.getById(item.id)).rejects.toThrow('物品不存在');
  });

  it('should isolate by family', async () => {
    await service.create(1, { name: 'A家' }, 1);
    await service.create(2, { name: 'B家' }, 1);
    const r = await service.list(1, {});
    expect(r.data.every((x: any) => x.familyId === 1)).toBe(true);
  });
});
