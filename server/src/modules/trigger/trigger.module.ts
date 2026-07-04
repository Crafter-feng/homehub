import { Module } from '@nestjs/common';
import { BindingsController } from './bindings.controller';
import { ScannerController } from './scanner.controller';
import { AutomationsController } from './automations.controller';
import { TriggerService } from './trigger.service';

@Module({
  controllers: [
    BindingsController,
    ScannerController,
    AutomationsController,
  ],
  providers: [TriggerService],
  exports: [TriggerService],
})
export class TriggerModule {}
