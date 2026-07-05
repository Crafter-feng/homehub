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
  let productId: number;

  it('should create a product', async () => {
    const product = await service.createProduct(1, {
      name: '可口可乐 330ml',
      unit: '瓶',
      brand: '可口可乐',
      barcode: 'barcode-001',
      locationId: 1,
      minStock: 6,
    });
    expect(product.id).toBeTypeOf('number');
    expect(product.name).toBe('可口可乐 330ml');
    expect(product.familyId).toBe(1);
    productId = product.id;
  });

  it('should list products', async () => {
    await service.createProduct(1, { name: '百事可乐 500ml', unit: '瓶' });
    const result = await service.listProducts(1, {});
    expect(result.data.length).toBeGreaterThanOrEqual(2);
  });

  it('should search products', async () => {
    const result = await service.searchProducts(1, '可乐');
    expect(result.data.length).toBeGreaterThanOrEqual(1);
  });

  it('should get product by id', async () => {
    const product = await service.getProductById(productId, 1);
    expect(product.id).toBe(productId);
    expect(product.name).toBe('可口可乐 330ml');
  });

  it('should stock-in creating a batch', async () => {
    await service.stockIn(productId, 1, 1, { quantity: 6, price: 15, shop: '超市' });
    const product = await service.getProductById(productId, 1);
    expect(product.quantity).toBe(6);
  });

  it('should stock-in again adding to total', async () => {
    await service.stockIn(productId, 1, 1, { quantity: 12, price: 12, shop: '京东' });
    const product = await service.getProductById(productId, 1);
    expect(product.quantity).toBe(18);
  });

  it('should consume reducing quantity', async () => {
    const before = await service.getProductById(productId, 1);
    await service.consume(productId, 1, 1, { quantity: 3 });
    const after = await service.getProductById(productId, 1);
    expect(after.quantity).toBe(before.quantity - 3);
  });

  it('should reject over-consumption', async () => {
    await expect(
      service.consume(productId, 1, 1, { quantity: 999999 })
    ).rejects.toThrow('库存不足');
  });

  it('should adjust quantity', async () => {
    await service.adjust(productId, 1, 1, { quantity: 50 });
    const product = await service.getProductById(productId, 1);
    expect(product.quantity).toBe(50);
  });

  it('should list batches', async () => {
    const batches = await service.listBatches(productId, 1);
    expect(batches.length).toBeGreaterThan(0);
  });

  it('should get price history', async () => {
    const history = await service.getPriceHistory(productId, 1);
    expect(history).toHaveProperty('history');
    expect(history.history.length).toBeGreaterThan(0);
  });

  it('should delete a product', async () => {
    const product = await service.createProduct(1, { name: '待删除' });
    await service.deleteProduct(product.id, 1);
    await expect(service.getProductById(product.id, 1)).rejects.toThrow('产品不存在');
  });

  it('should merge two products', async () => {
    const p1 = await service.createProduct(1, { name: '合并产品A' });
    const p2 = await service.createProduct(1, { name: '合并产品B' });
    await service.stockIn(p2.id, 1, 1, { quantity: 10 });
    await service.mergeProducts(p1.id, p2.id, 1);
    const merged = await service.getProductById(p1.id, 1);
    expect(merged.quantity).toBe(10);
    await expect(service.getProductById(p2.id, 1)).rejects.toThrow('产品不存在');
  });
});
