import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { ApiConfigService } from '../config/api-config.service';
import { typeOrmBaseOptions } from './typeorm-base-options';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly apiConfig: ApiConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      ...typeOrmBaseOptions,
      migrationsRun: false,
      ...this.apiConfig.databaseConfig,
    };
  }
}
