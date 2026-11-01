import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiConfigService } from 'shared/infrastructure/config/api-config.service';
import { TypeormModule } from 'shared/infrastructure/database/typeorm.module';
import { RabbitmqModule } from 'shared/infrastructure/messaging/rabbitmq/rabbitmq.module';
import { TypeOrmUnitOfWork } from 'shared/infrastructure/database/transaction/typeorm-unit-of-work';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { InternalHttpModule } from 'shared/infrastructure/http/internal-http.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeormModule,
    RabbitmqModule,
    InternalHttpModule,
  ],
  providers: [
    ApiConfigService,
    { provide: UNIT_OF_WORK_DI_TOKEN, useClass: TypeOrmUnitOfWork },
  ],
  exports: [
    ApiConfigService,
    TypeormModule,
    RabbitmqModule,
    InternalHttpModule,
    UNIT_OF_WORK_DI_TOKEN,
  ],
})
export class SharedModule {}
