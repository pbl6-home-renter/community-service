import { Module } from '@nestjs/common';
import { TypeOrmModule as NestTypeOrmModule } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ApiConfigService } from '../config/api-config.service';
import { TypeOrmConfigService } from './typeorm-config.service';

@Module({
  imports: [
    NestTypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
      inject: [ApiConfigService],
      dataSourceFactory: async (options: DataSourceOptions | undefined) => {
        if (!options) {
          throw new Error(
            'Invalid options passed to TypeOrm dataSourceFactory',
          );
        }
        return new DataSource(options).initialize();
      },
    }),
  ],
})
export class TypeormModule {}
