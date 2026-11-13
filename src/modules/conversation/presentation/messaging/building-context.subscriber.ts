import { Inject, Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { CONVERSATION_MEMBER_DI_TOKEN } from 'modules/conversation-member/conversation-member.di-token';
import { ConversationMemberEntity } from 'modules/conversation-member/domain/entities/conversation-member.entity';
import { ConversationMemberRole } from 'modules/conversation-member/domain/enums/conversation-member-role.enum';
import { ConversationMemberStatus } from 'modules/conversation-member/domain/enums/conversation-member-status.enum';
import { ConversationParticipantType } from 'modules/conversation-member/domain/enums/conversation-participant-type.enum';
import { ConversationMemberRepository } from 'modules/conversation-member/domain/repositories/conversation-member.repository';
import { INBOX_DI_TOKEN } from 'modules/inbox/inbox.di-token';
import { InboxRepository } from 'modules/inbox/application/ports/inbox.repository';
import { MESSAGE_DI_TOKEN } from 'modules/message/message.di-token';
import { MessageRepository } from 'modules/message/domain/repositories/message.repository';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IntegrationEvent } from 'shared/application/messaging/integration-event';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { isValidUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConsumerRegistry } from 'shared/infrastructure/messaging/rabbitmq/consumer/consumer-registry';
import { ChatRealtimePort } from '../../application/ports/chat-realtime.port';
import { ConversationUserLookup } from '../../application/ports/conversation-user-lookup.port';
import { CONVERSATION_DI_TOKEN } from '../../conversation.di-token';
import { ConversationEntity } from '../../domain/entities/conversation.entity';
import { ConversationContextType } from '../../domain/enums/conversation-context-type.enum';
import { ConversationKind } from '../../domain/enums/conversation-kind.enum';
import { ConversationRepository } from '../../domain/repositories/conversation.repository';
import { ConversationTitle } from '../../domain/value-objects/conversation-title.vo';
import { BuildingCreatedIntegrationEvent } from './building-created.integration-event';
import {
  BUILDING_CONTEXT_CONSUMER_NAME,
  BUILDING_CONTEXT_CONSUMER_QUEUE,
  BUILDING_CREATED_EVENT,
} from './building-context-consumer.constants';

@Injectable()
export class BuildingContextSubscriber {
  private readonly logger = new Logger(BuildingContextSubscriber.name);

  constructor(
    @Inject(CONVERSATION_DI_TOKEN.REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(CONVERSATION_MEMBER_DI_TOKEN.REPOSITORY)
    private readonly members: ConversationMemberRepository,
    @Inject(MESSAGE_DI_TOKEN.REPOSITORY)
    private readonly messages: MessageRepository,
    @Inject(INBOX_DI_TOKEN.REPOSITORY)
    private readonly inbox: InboxRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(CONVERSATION_DI_TOKEN.USER_LOOKUP)
    private readonly userLookup: ConversationUserLookup,
    @Inject(CONVERSATION_DI_TOKEN.CHAT_REALTIME)
    private readonly realtime: ChatRealtimePort,
  ) {}

  @RabbitSubscribe({
    name: ConsumerRegistry.define({
      name: BUILDING_CONTEXT_CONSUMER_NAME,
      queue: BUILDING_CONTEXT_CONSUMER_QUEUE,
      routingKeys: [BUILDING_CREATED_EVENT],
    }),
  })
  async handle(event: IntegrationEvent): Promise<void> {
    this.assertBuildingCreated(event);
    const buildingId = event.payload.id;
    let activatedConversationId: Uuid | null = null;

    await this.unitOfWork.run(async (context) => {
      if (!(await this.inbox.recordIfNew(event.id, event.eventType, context))) {
        return;
      }

      let conversation = await this.conversations.findByContextForUpdate(
        ConversationContextType.BUILDING,
        buildingId,
        context,
      );
      if (conversation && conversation.kind !== ConversationKind.GROUP) {
        throw new ValidationException(
          'Building context must be a group conversation',
        );
      }
      if (!conversation) {
        conversation = ConversationEntity.create({
          kind: ConversationKind.GROUP,
          contextType: ConversationContextType.BUILDING,
          contextId: buildingId,
          title: ConversationTitle.create(event.payload.name),
          createdByUserId: event.payload.landlordId,
        });
        await this.conversations.save(conversation, context);
      }

      const member = await this.members.findByParticipantForUpdate(
        conversation.id,
        {
          participantType: ConversationParticipantType.USER,
          userId: event.payload.landlordId,
        },
        context,
      );
      if (member?.status === ConversationMemberStatus.ACTIVE) {
        if (member.role !== ConversationMemberRole.ADMIN) {
          member.changeRole(ConversationMemberRole.ADMIN);
          await this.members.save(member, context);
        }
        return;
      }

      const names = await this.userLookup.findDisplayNames([
        event.payload.landlordId,
      ]);
      const displayName = names.get(event.payload.landlordId.toLowerCase());
      if (!displayName) {
        throw new ValidationException('Building landlord is unavailable');
      }
      if (member) {
        const latestSequence = await this.messages.latestSequenceForUpdate(
          conversation.id,
          context,
        );
        member.reactivate(new Date(), latestSequence, displayName);
        member.changeRole(ConversationMemberRole.ADMIN);
        await this.members.save(member, context);
      } else {
        await this.members.save(
          ConversationMemberEntity.create({
            conversationId: conversation.id,
            participantType: ConversationParticipantType.USER,
            userId: event.payload.landlordId,
            displayName,
            role: ConversationMemberRole.ADMIN,
          }),
          context,
        );
      }
      activatedConversationId = conversation.id;
    });

    if (activatedConversationId) {
      try {
        this.realtime.membershipActivated(
          event.payload.landlordId,
          activatedConversationId,
        );
      } catch (error) {
        this.logger.warn(
          `Building chat realtime delivery failed: ${String(error)}`,
        );
      }
    }
  }

  private assertBuildingCreated(
    event: unknown,
  ): asserts event is BuildingCreatedIntegrationEvent {
    if (
      !this.isRecord(event) ||
      typeof event.id !== 'string' ||
      !isValidUuid(event.id) ||
      event.eventType !== BUILDING_CREATED_EVENT ||
      event.routingKey !== BUILDING_CREATED_EVENT ||
      !this.isRecord(event.payload)
    ) {
      throw new ValidationException(
        'Invalid building.created integration event',
      );
    }
    const { id, landlordId, name } = event.payload;
    if (
      typeof id !== 'string' ||
      !isValidUuid(id) ||
      typeof landlordId !== 'string' ||
      !isValidUuid(landlordId) ||
      typeof name !== 'string' ||
      !name.trim() ||
      name.length > 255
    ) {
      throw new ValidationException('Invalid building.created payload');
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
