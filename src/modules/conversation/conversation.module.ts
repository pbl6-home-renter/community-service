import { Module } from '@nestjs/common';
import { InboxModule } from 'modules/inbox/inbox.module';
import { ContractContextSubscriber } from './presentation/messaging/contract-context.subscriber';
import { ContractContextApplyCommandHandler } from './application/commands/contract-context-apply/contract-context-apply.command.handler';
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
import { ConversationUnreadSummaryQueryHandler } from './application/queries/conversation-unread-summary/conversation-unread-summary.query.handler';
import { TypeOrmConversationUnreadSummaryQuery } from './infrastructure/queries/typeorm-conversation-unread-summary.query';
import { IdentityConversationUserLookupService } from './infrastructure/services/identity-conversation-user-lookup.service';
import { TypeOrmConversationDetailQuery } from './infrastructure/queries/typeorm-conversation-detail.query';
import { TypeOrmConversationPageQuery } from './infrastructure/queries/typeorm-conversation-page.query';
import { CONVERSATION_DI_TOKEN } from './conversation.di-token';
import { ConversationTypeormEntity } from './infrastructure/persistence/conversation.typeorm-entity';
import { ContractContextEventTypeormEntity } from './infrastructure/persistence/contract-context-event.typeorm-entity';
import { TypeOrmContractContextEventStore } from './infrastructure/persistence/contract-context-event.store';
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
import { MessageMarkReadCommandHandler } from 'modules/message/application/commands/message-mark-read/message-mark-read.command.handler';
import { ConversationMetadataUpdateCommandHandler } from './application/commands/conversation-metadata-update/conversation-metadata-update.command.handler';
import { IdentityConversationAvatarValidatorService } from './infrastructure/services/identity-conversation-avatar-validator.service';
import { RealtimeModule } from 'modules/realtime/realtime.module';
import { ConversationSocketAccessService } from './application/queries/conversation-socket-access.service';
import { ChatGateway } from './infrastructure/realtime/chat.gateway';
import { PushDeviceModule } from 'modules/push-device/push-device.module';
import { ChatMessagePushNotifier } from 'modules/message/application/services/chat-message-push-notifier';

const commandHandlers = [
  ContractContextApplyCommandHandler,
  ConversationCreateCommandHandler,
  ConversationMembersAddCommandHandler,
  ConversationMemberDepartureCommandHandler,
  ConversationMemberRoleUpdateCommandHandler,
  MessageSendCommandHandler,
  MessageMarkReadCommandHandler,
  ConversationMetadataUpdateCommandHandler,
];
const queryHandlers = [
  ConversationListQueryHandler,
  ConversationGetDetailQueryHandler,
  ConversationUnreadSummaryQueryHandler,
  ConversationMediaOwnershipLookupQueryHandler,
  MessageListQueryHandler,
];

@Module({
  imports: [
    CqrsModule,
    InboxModule,
    RealtimeModule,
    ConversationMemberModule,
    MessageModule,
    PushDeviceModule,
    TypeOrmModule.forFeature([
      ConversationTypeormEntity,
      ContractContextEventTypeormEntity,
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
    ContractContextSubscriber,
    TypeOrmContractContextEventStore,
    ...commandHandlers,
    ...queryHandlers,
    ConversationSocketAccessService,
    ChatMessagePushNotifier,
    ChatGateway,
    TypeOrmConversationDetailQuery,
    TypeOrmConversationPageQuery,
    TypeOrmConversationMediaOwnershipQuery,
    TypeOrmMessagePageQuery,
    IdentityMessageMediaValidatorService,
    IdentityConversationAvatarValidatorService,
    {
      provide: CONVERSATION_DI_TOKEN.CHAT_REALTIME,
      useExisting: ChatGateway,
    },
    {
      provide: CONVERSATION_DI_TOKEN.CONTEXT_EVENT_STORE,
      useExisting: TypeOrmContractContextEventStore,
    },
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
      provide: CONVERSATION_DI_TOKEN.UNREAD_SUMMARY_QUERY,
      useClass: TypeOrmConversationUnreadSummaryQuery,
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
    {
      provide: CONVERSATION_DI_TOKEN.AVATAR_VALIDATOR,
      useExisting: IdentityConversationAvatarValidatorService,
    },
  ],
  exports: [
    CONVERSATION_DI_TOKEN.REPOSITORY,
    CONVERSATION_DI_TOKEN.CHAT_REALTIME,
  ],
})
export class ConversationModule {}
