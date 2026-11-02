import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { ConversationMemberModule } from 'modules/conversation-member/conversation-member.module';
import { MessageModule } from 'modules/message/message.module';
import { ConversationCreateCommandHandler } from './application/commands/conversation-create/conversation-create.command.handler';
import { ConversationListQueryHandler } from './application/queries/conversation-list/conversation-list.query.handler';
import { ConversationGetDetailQueryHandler } from './application/queries/conversation-get-detail/conversation-get-detail.query.handler';
import { IdentityConversationUserLookupService } from './infrastructure/services/identity-conversation-user-lookup.service';
import { TypeOrmConversationDetailQuery } from './infrastructure/queries/typeorm-conversation-detail.query';
import { TypeOrmConversationPageQuery } from './infrastructure/queries/typeorm-conversation-page.query';
import { CONVERSATION_DI_TOKEN } from './conversation.di-token';
import { ConversationTypeormEntity } from './infrastructure/persistence/conversation.typeorm-entity';
import { TypeOrmConversationRepository } from './infrastructure/persistence/conversation.repository';
import { ConversationMemberTypeormEntity } from 'modules/conversation-member/infrastructure/persistence/conversation-member.typeorm-entity';
import { ConversationController } from './presentation/http/controllers/conversation.controller';

const commandHandlers = [ConversationCreateCommandHandler];
const queryHandlers = [
  ConversationListQueryHandler,
  ConversationGetDetailQueryHandler,
];

@Module({
  imports: [
    CqrsModule,
    ConversationMemberModule,
    MessageModule,
    TypeOrmModule.forFeature([
      ConversationTypeormEntity,
      ConversationMemberTypeormEntity,
    ]),
  ],
  controllers: [ConversationController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    TypeOrmConversationDetailQuery,
    TypeOrmConversationPageQuery,
    {
      provide: CONVERSATION_DI_TOKEN.USER_LOOKUP,
      useClass: IdentityConversationUserLookupService,
    },
    {
      provide: CONVERSATION_DI_TOKEN.REPOSITORY,
      useClass: TypeOrmConversationRepository,
    },
    {
      provide: CONVERSATION_DI_TOKEN.DETAIL_QUERY,
      useExisting: TypeOrmConversationDetailQuery,
    },
    {
      provide: CONVERSATION_DI_TOKEN.PAGE_QUERY,
      useExisting: TypeOrmConversationPageQuery,
    },
  ],
  exports: [CONVERSATION_DI_TOKEN.REPOSITORY],
})
export class ConversationModule {}
