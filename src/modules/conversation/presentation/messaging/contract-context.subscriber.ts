import { Inject, Injectable } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { CONVERSATION_MEMBER_DI_TOKEN } from 'modules/conversation-member/conversation-member.di-token';
import { ConversationMemberEntity } from 'modules/conversation-member/domain/entities/conversation-member.entity';
import { ConversationMemberRole } from 'modules/conversation-member/domain/enums/conversation-member-role.enum';
import { ConversationMemberStatus } from 'modules/conversation-member/domain/enums/conversation-member-status.enum';
import { ConversationParticipantType } from 'modules/conversation-member/domain/enums/conversation-participant-type.enum';
import { ConversationMemberRepository } from 'modules/conversation-member/domain/repositories/conversation-member.repository';
import { InboxRepository } from 'modules/inbox/application/ports/inbox.repository';
import { INBOX_DI_TOKEN } from 'modules/inbox/inbox.di-token';
import { MessageRepository } from 'modules/message/domain/repositories/message.repository';
import { MESSAGE_DI_TOKEN } from 'modules/message/message.di-token';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IntegrationEvent } from 'shared/application/messaging/integration-event';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { isValidUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConsumerRegistry } from 'shared/infrastructure/messaging/rabbitmq/consumer/consumer-registry';
import { ChatRealtimePort } from '../../application/ports/chat-realtime.port';
import { CONVERSATION_DI_TOKEN } from '../../conversation.di-token';
import { ConversationContextType } from '../../domain/enums/conversation-context-type.enum';
import { ConversationKind } from '../../domain/enums/conversation-kind.enum';
import { ConversationNotFoundException } from '../../domain/exceptions/conversation-not-found.exception';
import { ConversationRepository } from '../../domain/repositories/conversation.repository';
import { ContractMemberLinkedIntegrationEvent } from './contract-member-linked.integration-event';
import {
  CONTRACT_CONTEXT_CONSUMER_NAME,
  CONTRACT_CONTEXT_CONSUMER_QUEUE,
  CONTRACT_MEMBER_LINKED_EVENT,
} from './contract-context-consumer.constants';

@Injectable()
export class ContractContextSubscriber {
  constructor(
    @Inject(CONVERSATION_DI_TOKEN.REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(CONVERSATION_MEMBER_DI_TOKEN.REPOSITORY)
    private readonly members: ConversationMemberRepository,
    @Inject(MESSAGE_DI_TOKEN.REPOSITORY)
    private readonly messages: MessageRepository,
    @Inject(INBOX_DI_TOKEN.REPOSITORY)
    private readonly inboxRepository: InboxRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(CONVERSATION_DI_TOKEN.CHAT_REALTIME)
    private readonly realtime: ChatRealtimePort,
  ) {}

  @RabbitSubscribe({
    name: ConsumerRegistry.define({
      name: CONTRACT_CONTEXT_CONSUMER_NAME,
      queue: CONTRACT_CONTEXT_CONSUMER_QUEUE,
      routingKeys: [CONTRACT_MEMBER_LINKED_EVENT],
    }),
  })
  async handle(event: IntegrationEvent): Promise<void> {
    this.assertContractMemberLinkedEvent(event);
    let conversationId: Uuid | null = null;
    await this.handleOnce(event, async (context) => {
      conversationId = await this.onMemberLinked(event, context);
    });
    if (conversationId)
      this.realtime.membershipActivated(
        event.payload.tenantUserId,
        conversationId,
      );
  }

  private async onMemberLinked(
    event: ContractMemberLinkedIntegrationEvent,
    context: TransactionContext,
  ): Promise<Uuid | null> {
    const { contractId, tenantUserId } = event.payload;
    const conversation = await this.conversations.findByContextForUpdate(
      ConversationContextType.CONTRACT,
      contractId,
      context,
    );
    if (!conversation) throw new ConversationNotFoundException();
    if (conversation.kind !== ConversationKind.GROUP) {
      throw new ValidationException(
        'Contract conversation context must be a group',
      );
    }
    const existing = await this.members.findByParticipantForUpdate(
      conversation.id,
      {
        participantType: ConversationParticipantType.USER,
        userId: tenantUserId,
      },
      context,
    );
    if (existing?.status === ConversationMemberStatus.ACTIVE) return null;

    const latestSequence = await this.messages.latestSequenceForUpdate(
      conversation.id,
      context,
    );
    if (existing) {
      existing.reactivate(new Date(), latestSequence, existing.displayName);
      await this.members.save(existing, context);
    } else {
      const member = ConversationMemberEntity.create({
        conversationId: conversation.id,
        participantType: ConversationParticipantType.USER,
        userId: tenantUserId,
        displayName: 'Tenant',
        role: ConversationMemberRole.MEMBER,
        lastReadSequence: latestSequence,
      });
      await this.members.save(member, context);
    }
    return conversation.id;
  }

  private async handleOnce(
    event: IntegrationEvent,
    sideEffect: (context: TransactionContext) => Promise<void>,
  ): Promise<void> {
    await this.unitOfWork.run(async (context) => {
      const isNew = await this.inboxRepository.recordIfNew(
        event.id,
        event.eventType,
        context,
      );
      if (!isNew) return;

      await sideEffect(context);
    });
  }

  private assertContractMemberLinkedEvent(
    event: unknown,
  ): asserts event is ContractMemberLinkedIntegrationEvent {
    if (
      !this.isRecord(event) ||
      typeof event.id !== 'string' ||
      !isValidUuid(event.id) ||
      event.eventType !== CONTRACT_MEMBER_LINKED_EVENT ||
      event.routingKey !== CONTRACT_MEMBER_LINKED_EVENT ||
      !this.isRecord(event.payload)
    ) {
      throw new ValidationException(
        'Invalid contract_member.linked integration event',
      );
    }
    const payload = event.payload;
    if (
      ['contractId', 'contractMemberId', 'tenantUserId'].some(
        (field) =>
          typeof payload[field] !== 'string' || !isValidUuid(payload[field]),
      )
    ) {
      throw new ValidationException(
        'Invalid contract_member.linked integration event',
      );
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
