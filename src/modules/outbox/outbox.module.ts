import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OUTBOX_DI_TOKEN } from './outbox.di-token';
import { OutboxTypeormEntity } from './infrastructure/persistence/outbox.typeorm-entity';
import { TypeOrmOutboxRepository } from './infrastructure/persistence/outbox.repository';
import { OutboxRelayHandler } from './application/outbox-relay/outbox-relay.handler';
import { OutboxRelayScheduler } from './infrastructure/scheduler/outbox-relay.scheduler';
import { ApiConfigService } from 'shared/infrastructure/config/api-config.service';

@Module({
  imports: [TypeOrmModule.forFeature([OutboxTypeormEntity])],
  providers: [
    { provide: OUTBOX_DI_TOKEN.REPOSITORY, useClass: TypeOrmOutboxRepository },
    {
      provide: OUTBOX_DI_TOKEN.CONFIG,
      useFactory: (config: ApiConfigService) => config.outboxConfig,
      inject: [ApiConfigService],
    },
    OutboxRelayHandler,
    OutboxRelayScheduler,
  ],
  exports: [OUTBOX_DI_TOKEN.REPOSITORY],
})
export class OutboxModule {}
