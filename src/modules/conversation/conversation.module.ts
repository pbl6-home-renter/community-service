import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CONVERSATION_DI_TOKEN } from './conversation.di-token';
import { ConversationMemberTypeormEntity } from './infrastructure/persistence/conversation-member.typeorm-entity';
import { TypeOrmConversationMemberRepository } from './infrastructure/persistence/conversation-member.repository';
import { ConversationTypeormEntity } from './infrastructure/persistence/conversation.typeorm-entity';
import { TypeOrmConversationRepository } from './infrastructure/persistence/conversation.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConversationTypeormEntity,
      ConversationMemberTypeormEntity,
    ]),
  ],
  providers: [
    {
      provide: CONVERSATION_DI_TOKEN.REPOSITORY,
      useClass: TypeOrmConversationRepository,
    },
    {
      provide: CONVERSATION_DI_TOKEN.MEMBER_REPOSITORY,
      useClass: TypeOrmConversationMemberRepository,
    },
  ],
  exports: [
    CONVERSATION_DI_TOKEN.REPOSITORY,
    CONVERSATION_DI_TOKEN.MEMBER_REPOSITORY,
  ],
})
export class ConversationModule {}
