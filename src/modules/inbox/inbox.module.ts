import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { INBOX_DI_TOKEN } from './inbox.di-token';
import { InboxTypeormEntity } from './infrastructure/persistence/inbox.typeorm-entity';
import { TypeOrmInboxRepository } from './infrastructure/persistence/inbox.repository';

@Module({
  imports: [TypeOrmModule.forFeature([InboxTypeormEntity])],
  providers: [
    { provide: INBOX_DI_TOKEN.REPOSITORY, useClass: TypeOrmInboxRepository },
  ],
  exports: [INBOX_DI_TOKEN.REPOSITORY],
})
export class InboxModule {}
