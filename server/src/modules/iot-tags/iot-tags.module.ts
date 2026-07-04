import { Module } from '@nestjs/common';
import { IotTagsService } from './iot-tags.service';
import { RfidReadersController, RfidZonesController } from './iot-tags.controller';

@Module({
  controllers: [RfidReadersController, RfidZonesController],
  providers: [IotTagsService],
  exports: [IotTagsService],
})
export class IotTagsModule {}
