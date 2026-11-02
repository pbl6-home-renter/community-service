import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CONVERSATION_MEMBER_DI_TOKEN } from './conversation-member.di-token';
import { TypeOrmConversationMemberRepository } from './infrastructure/persistence/conversation-member.repository';
import { ConversationMemberTypeormEntity } from './infrastructure/persistence/conversation-member.typeorm-entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConversationMemberTypeormEntity])],
  providers: [
    {
      provide: CONVERSATION_MEMBER_DI_TOKEN.REPOSITORY,
      useClass: TypeOrmConversationMemberRepository,
    },
  ],
  exports: [CONVERSATION_MEMBER_DI_TOKEN.REPOSITORY],
})
export class ConversationMemberModule {}
