import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CONVERSATION_DI_TOKEN } from './conversation.di-token';
import { ConversationTypeormEntity } from './infrastructure/persistence/conversation.typeorm-entity';
import { TypeOrmConversationRepository } from './infrastructure/persistence/conversation.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConversationTypeormEntity]),
  ],
  providers: [
    {
      provide: CONVERSATION_DI_TOKEN.REPOSITORY,
      useClass: TypeOrmConversationRepository,
    },
  ],
  exports: [CONVERSATION_DI_TOKEN.REPOSITORY],
})
export class ConversationModule {}
