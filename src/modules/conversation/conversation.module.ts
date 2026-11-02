import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { ConversationMemberModule } from 'modules/conversation-member/conversation-member.module';
import { MessageModule } from 'modules/message/message.module';
import { ConversationCreateCommandHandler } from './application/commands/conversation-create/conversation-create.command.handler';
import { IdentityConversationUserLookupService } from './infrastructure/services/identity-conversation-user-lookup.service';
import { CONVERSATION_DI_TOKEN } from './conversation.di-token';
import { ConversationTypeormEntity } from './infrastructure/persistence/conversation.typeorm-entity';
import { TypeOrmConversationRepository } from './infrastructure/persistence/conversation.repository';
import { ConversationController } from './presentation/http/controllers/conversation.controller';

@Module({
  imports: [
    CqrsModule,
    ConversationMemberModule,
    MessageModule,
    TypeOrmModule.forFeature([ConversationTypeormEntity]),
  ],
  controllers: [ConversationController],
  providers: [
    ConversationCreateCommandHandler,
    {
      provide: CONVERSATION_DI_TOKEN.USER_LOOKUP,
      useClass: IdentityConversationUserLookupService,
    },
    {
      provide: CONVERSATION_DI_TOKEN.REPOSITORY,
      useClass: TypeOrmConversationRepository,
    },
  ],
  exports: [CONVERSATION_DI_TOKEN.REPOSITORY],
})
export class ConversationModule {}
