import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { StockService } from './stock.service';
import { createTestModule } from '../../test/test-helper';

// Mock for PluginRegistryService
class MockRegistry {
  getPluginByType() { return null; }
  getItemTypeConfig() { return null; }
}

// Mock for ListsService
class MockListsService {
  async autoReplenish() { return { added: 0, message: 'mock' }; }
}

let module: any;
let service: StockService;

beforeAll(async () => {
  const ctx = await createTestModule([
    StockService,
    { provide: 'PluginRegistryService', useClass: MockRegistry },
    { provide: 'ListsService', useClass: MockListsService },
  ]);
  module = ctx.module;
  service = module.get(StockService);

  // Patch the registry after module init
  // @ts-ignore - directly set the private property
  service['registry'] = new MockRegistry();
  // @ts-ignore
  service['listsService'] = new MockListsService();
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
    const item = await service.getById(itemId, 1);
    expect(item.id).toBe(itemId);
    expect(item.name).toBe('测试物品');
  });

  it('should stock-in with price update', async () => {
    const after = await service.stockIn(itemId, 1, 1, { quantity: 5, price: 20 });
    expect(after.lastPrice).toBe(20);
    expect(after.quantity).toBeGreaterThan(10);
  });

  it('should stock-in with shop field', async () => {
    const item = await service.create(1, {
      name: 'Shop Test Item',
      type: '测试',
    }, 1);

    await service.stockIn(item.id, 1, 1, {
      quantity: 2,
      price: 15,
      shop: '超市A',
    });

    const priceHistory = await service.getPriceHistory(item.id, 1);
    expect(priceHistory.history.length).toBeGreaterThanOrEqual(1);
    // The most recent record should have the shop
    const records = priceHistory.history;
    const withShop = records.find((r: any) => r.store === '超市A');
    expect(withShop).toBeDefined();
    expect(withShop.price).toBe(15);
  });

  it('should stock-in with shop fallback to item.shop', async () => {
    const item = await service.create(1, {
      name: 'Fallback Shop Item',
      type: '测试',
      shop: '默认商店',
    }, 1);

    await service.stockIn(item.id, 1, 1, { quantity: 1, price: 10 });
    const priceHistory = await service.getPriceHistory(item.id, 1);
    // Find the stock-in record (not the create record)
    const stockInRecord = priceHistory.history.find((r: any) => r.price === 10);
    expect(stockInRecord).toBeDefined();
    expect(stockInRecord.store).toBe('默认商店');
  });

  it('should record spec in stock-in transaction', async () => {
    const item = await service.create(1, {
      name: 'Spec Item',
      type: '测试',
    }, 1);

    await service.stockIn(item.id, 1, 1, { quantity: 3, price: 25 });
    const priceHistory = await service.getPriceHistory(item.id, 1);
    const stockInRecord = priceHistory.history.find((r: any) => r.price === 25);
    expect(stockInRecord).toBeDefined();
    expect(stockInRecord).toHaveProperty('spec');
  });

  it('should consume reducing quantity', async () => {
    const before = await service.getById(itemId, 1);
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
    const history = await service.getHistory(itemId, 1);
    expect(history.length).toBeGreaterThan(0);
    const types = history.map((h: any) => h.type);
    expect(types).toContain('add');
    expect(types).toContain('transfer');
    expect(types).toContain('adjust');
  });

  it('should get price history with raw store values', async () => {
    const item = await service.create(1, {
      name: 'Price History Item',
      type: '测试',
    }, 1);

    await service.stockIn(item.id, 1, 1, { quantity: 1, price: 30, shop: '测试商店' });

    const priceHistory = await service.getPriceHistory(item.id, 1);
    expect(priceHistory).toHaveProperty('currentPrice');
    expect(priceHistory).toHaveProperty('avgPrice');
    expect(priceHistory).toHaveProperty('minPrice');
    expect(priceHistory).toHaveProperty('maxPrice');
    expect(priceHistory).toHaveProperty('history');
    expect(Array.isArray(priceHistory.history)).toBe(true);

    for (const entry of priceHistory.history) {
      expect(entry).toHaveProperty('store');
      expect(entry).toHaveProperty('spec');
      expect(typeof entry.store === 'string' || entry.store === null).toBe(true);
    }

    const withShop = priceHistory.history.find((r: any) => r.store === '测试商店');
    expect(withShop).toBeDefined();
  });

  it('should find expiring items', async () => {
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
    await expect(service.getById(item.id, 1)).rejects.toThrow('物品不存在');
  });

  it('should isolate by family', async () => {
    await service.create(1, { name: 'A家' }, 1);
    await service.create(2, { name: 'B家' }, 1);
    const r = await service.list(1, {});
    expect(r.data.every((x: any) => x.familyId === 1)).toBe(true);
  });
});
