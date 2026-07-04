import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../../db/database.module';
import { mdBrands } from '../../../db/schema';
import { BaseMasterDataService } from '../../../common/base-master-data.service';

@Injectable()
export class BrandsService extends BaseMasterDataService<typeof mdBrands> {
  constructor(
    @Inject(DATABASE_TOKEN) db: any,
  ) {
    super(db, mdBrands, '品牌', ['name', 'notes']);
  }
}
