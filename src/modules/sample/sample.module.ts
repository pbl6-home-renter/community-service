import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { SampleTypeormEntity } from './infrastructure/persistence/sample.typeorm-entity';
import { TypeOrmSampleRepository } from './infrastructure/persistence/sample.repository';
import { SAMPLE_DI_TOKEN } from './sample.di-token';
import { SampleController } from './presentation/http/controllers/sample.controller';
import { SampleCreateCommandHandler } from './application/commands/sample-create/sample-create.command.handler';
import { SampleDeleteCommandHandler } from './application/commands/sample-delete/sample-delete.command.handler';
import { SampleGetByIdQueryHandler } from './application/queries/sample-get-by-id/sample-get-by-id.query.handler';
import { SampleSubscriber } from './presentation/messaging/sample.subscriber';
import { OutboxModule } from 'modules/outbox/outbox.module';
import { InboxModule } from 'modules/inbox/inbox.module';

const commandHandlers = [
  SampleCreateCommandHandler,
  SampleDeleteCommandHandler,
];
const queryHandlers = [SampleGetByIdQueryHandler];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([SampleTypeormEntity]),
    OutboxModule, // publisher side: SampleCreateCommandHandler appends to the outbox
    InboxModule, // consumer side: SampleSubscriber deduplicates deliveries
  ],
  controllers: [SampleController],
  providers: [
    {
      provide: SAMPLE_DI_TOKEN.REPOSITORY,
      useClass: TypeOrmSampleRepository,
    },
    ...commandHandlers,
    ...queryHandlers,
    SampleSubscriber,
  ],
  exports: [SAMPLE_DI_TOKEN.REPOSITORY],
})
export class SampleModule {}
