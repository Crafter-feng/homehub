import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private readonly nestConfig: NestConfigService) {}

  get(key: string, defaultValue?: string): string {
    return this.nestConfig.get<string>(key, defaultValue || '');
  }

  getNumber(key: string, defaultValue: number): number {
    return this.nestConfig.get<number>(key, defaultValue);
  }

  getBoolean(key: string, defaultValue: boolean): boolean {
    return this.nestConfig.get<boolean>(key, defaultValue);
  }
}
