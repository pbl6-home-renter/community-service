import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { ConversationMemberModule } from 'modules/conversation-member/conversation-member.module';
import { MessageModule } from 'modules/message/message.module';
import { ConversationCreateCommandHandler } from './application/commands/conversation-create/conversation-create.command.handler';
import { ConversationMembersAddCommandHandler } from './application/commands/conversation-members-add/conversation-members-add.command.handler';
import { ConversationMemberDepartureCommandHandler } from './application/commands/conversation-member-departure/conversation-member-departure.command.handler';
import { ConversationMemberRoleUpdateCommandHandler } from './application/commands/conversation-member-role-update/conversation-member-role-update.command.handler';
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
import { ConversationMediaOwnershipInternalController } from './presentation/http/controllers/conversation-media-ownership-internal.controller';
import { MessageTypeormEntity } from 'modules/message/infrastructure/persistence/message.typeorm-entity';
import { ConversationMediaOwnershipLookupQueryHandler } from './application/queries/conversation-media-ownership-lookup/conversation-media-ownership-lookup.query.handler';
import { TypeOrmConversationMediaOwnershipQuery } from './infrastructure/queries/typeorm-conversation-media-ownership.query';
import { MessageSendCommandHandler } from 'modules/message/application/commands/message-send/message-send.command.handler';
import { MessageListQueryHandler } from 'modules/message/application/queries/message-list/message-list.query.handler';
import { TypeOrmMessagePageQuery } from 'modules/message/infrastructure/queries/typeorm-message-page.query';
import { MessageController } from 'modules/message/presentation/http/controllers/message.controller';
import { MESSAGE_DI_TOKEN } from 'modules/message/message.di-token';
import { IdentityMessageMediaValidatorService } from 'modules/message/infrastructure/services/identity-message-media-validator.service';

const commandHandlers = [
  ConversationCreateCommandHandler,
  ConversationMembersAddCommandHandler,
  ConversationMemberDepartureCommandHandler,
  ConversationMemberRoleUpdateCommandHandler,
  MessageSendCommandHandler,
];
const queryHandlers = [
  ConversationListQueryHandler,
  ConversationGetDetailQueryHandler,
  ConversationMediaOwnershipLookupQueryHandler,
  MessageListQueryHandler,
];

@Module({
  imports: [
    CqrsModule,
    ConversationMemberModule,
    MessageModule,
    TypeOrmModule.forFeature([
      ConversationTypeormEntity,
      ConversationMemberTypeormEntity,
      MessageTypeormEntity,
    ]),
  ],
  controllers: [
    ConversationController,
    ConversationMediaOwnershipInternalController,
    MessageController,
  ],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    TypeOrmConversationDetailQuery,
    TypeOrmConversationPageQuery,
    TypeOrmConversationMediaOwnershipQuery,
    TypeOrmMessagePageQuery,
    IdentityMessageMediaValidatorService,
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
    {
      provide: CONVERSATION_DI_TOKEN.MEDIA_OWNERSHIP_QUERY,
      useExisting: TypeOrmConversationMediaOwnershipQuery,
    },
    {
      provide: MESSAGE_DI_TOKEN.PAGE_QUERY,
      useExisting: TypeOrmMessagePageQuery,
    },
    {
      provide: MESSAGE_DI_TOKEN.MEDIA_VALIDATOR,
      useExisting: IdentityMessageMediaValidatorService,
    },
  ],
  exports: [CONVERSATION_DI_TOKEN.REPOSITORY],
})
export class ConversationModule {}
