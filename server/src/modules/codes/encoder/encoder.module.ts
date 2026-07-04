import { Module } from '@nestjs/common';
import { EncoderController } from './encoder.controller';
import { EncoderService } from './encoder.service';

@Module({
  controllers: [EncoderController],
  providers: [EncoderService],
  exports: [EncoderService],
})
export class EncoderModule {}