import { Module } from '@nestjs/common';
import { LocationsModule } from './locations/locations.module';
import { CategoriesModule } from './categories/categories.module';
import { TagsModule } from './tags/tags.module';
import { UnitsModule } from './units/units.module';
import { BrandsModule } from './brands/brands.module';
import { ShopsModule } from './shops/shops.module';

/**
 * MasterData 模块 - 系统数据管理
 * 统一管理位置、分类、标签、计量单位、品牌、商店等基础数据
 */
@Module({
  imports: [
    LocationsModule,
    CategoriesModule,
    TagsModule,
    UnitsModule,
    BrandsModule,
    ShopsModule,
  ],
  exports: [
    LocationsModule,
    CategoriesModule,
    TagsModule,
    UnitsModule,
    BrandsModule,
    ShopsModule,
  ],
})
export class MasterDataModule {}
