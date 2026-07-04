import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ProductsService } from './products.service';
import { createTestModule } from '../../test/test-helper';

let module: any;
let service: ProductsService;

beforeAll(async () => {
  const ctx = await createTestModule([ProductsService]);
  module = ctx.module;
  service = module.get(ProductsService);
});

afterAll(() => {
  if (module) module.close();
});

describe('ProductsService', () => {
  it('should create a product', async () => {
    const p = await service.create(1, { name: '测试产品', unit: '个', brand: '测试品牌', barcode: '123456789' });
    expect(p.id).toBeTypeOf('number');
    expect(p.name).toBe('测试产品');
    expect(p.barcode).toBe('123456789');
    expect(p.familyId).toBe(1);
  });

  it('should list products', async () => {
    await service.create(1, { name: '产品A' });
    await service.create(1, { name: '产品B' });
    const list = await service.list(1);
    expect(list.length).toBeGreaterThanOrEqual(2);
  });

  it('should search products', async () => {
    await service.create(1, { name: '特价苹果', barcode: '111' });
    await service.create(1, { name: '富士苹果', barcode: '222' });
    await service.create(1, { name: '香蕉', barcode: '333' });
    const results = await service.search(1, '苹果');
    expect(results.length).toBe(2);
  });

  it('should get product by id', async () => {
    const p = await service.create(1, { name: '查詢產品' });
    const found = await service.getById(p.id);
    expect(found.id).toBe(p.id);
  });

  it('should throw for non-existent product', async () => {
    await expect(service.getById(99999)).rejects.toThrow('产品不存在');
  });

  it('should update a product', async () => {
    const p = await service.create(1, { name: '旧名称' });
    const updated = await service.update(p.id, 1, { name: '新名称', unit: '箱' });
    expect(updated.name).toBe('新名称');
    expect(updated.unit).toBe('箱');
  });

  it('should delete a product', async () => {
    const p = await service.create(1, { name: '待删除' });
    await service.delete(p.id, 1);
    await expect(service.getById(p.id)).rejects.toThrow('产品不存在');
  });

  it('should isolate by familyId', async () => {
    await service.create(1, { name: '家庭1' });
    await service.create(2, { name: '家庭2' });
    const list1 = await service.list(1);
    expect(list1.every((r: any) => r.familyId === 1)).toBe(true);
  });
});
