import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CONVERSATION_MEMBER_DI_TOKEN } from 'modules/conversation-member/conversation-member.di-token';
import { ConversationMemberEntity } from 'modules/conversation-member/domain/entities/conversation-member.entity';
import { ConversationMemberRole } from 'modules/conversation-member/domain/enums/conversation-member-role.enum';
import { ConversationMemberStatus } from 'modules/conversation-member/domain/enums/conversation-member-status.enum';
import { ConversationParticipantType } from 'modules/conversation-member/domain/enums/conversation-participant-type.enum';
import { ConversationMemberRepository } from 'modules/conversation-member/domain/repositories/conversation-member.repository';
import { MessageRepository } from 'modules/message/domain/repositories/message.repository';
import { MESSAGE_DI_TOKEN } from 'modules/message/message.di-token';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractContextEventStore } from '../../ports/contract-context-event-store.port';
import { ConversationUserLookup } from '../../ports/conversation-user-lookup.port';
import { CONVERSATION_DI_TOKEN } from '../../../conversation.di-token';
import { ConversationEntity } from '../../../domain/entities/conversation.entity';
import { ConversationContextType } from '../../../domain/enums/conversation-context-type.enum';
import { ConversationKind } from '../../../domain/enums/conversation-kind.enum';
import { ConversationRepository } from '../../../domain/repositories/conversation.repository';
import {
  ContractContextApplyCommand,
  ContractContextChange,
  ContractMembershipChange,
} from './contract-context-apply.command';

@CommandHandler(ContractContextApplyCommand)
export class ContractContextApplyCommandHandler implements ICommandHandler<
  ContractContextApplyCommand,
  ContractMembershipChange[]
> {
  constructor(
    @Inject(CONVERSATION_DI_TOKEN.REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(CONVERSATION_MEMBER_DI_TOKEN.REPOSITORY)
    private readonly members: ConversationMemberRepository,
    @Inject(MESSAGE_DI_TOKEN.REPOSITORY)
    private readonly messages: MessageRepository,
    @Inject(CONVERSATION_DI_TOKEN.CONTEXT_EVENT_STORE)
    private readonly events: ContractContextEventStore,
    @Inject(CONVERSATION_DI_TOKEN.USER_LOOKUP)
    private readonly userLookup: ConversationUserLookup,
  ) {}

  async execute(
    command: ContractContextApplyCommand,
  ): Promise<ContractMembershipChange[]> {
    const { event, context } = command;
    await this.events.lockContract(event.payload.contractId, context);
    await this.events.save(
      event,
      event.payload.contractId,
      event.eventType === 'contract.activated'
        ? null
        : event.payload.tenantUserId,
      context,
    );
    let conversation = await this.conversations.findByContextForUpdate(
      ConversationContextType.CONTRACT,
      event.payload.contractId,
      context,
    );
    const changes: ContractMembershipChange[] = [];
    const activation = await this.events.findActivation(
      event.payload.contractId,
      context,
    );
    if (!activation) return changes;
    const pending = await this.events.findPending(
      event.payload.contractId,
      context,
    );
    const userIds = conversation
      ? []
      : [activation.payload.landlordId, ...activation.payload.tenantUserIds];
    for (const item of pending) {
      if (
        (item.eventType === 'contract_member.added' ||
          item.eventType === 'contract_member.linked') &&
        new Date(item.occurredAt) >= new Date(activation.occurredAt) &&
        item.payload.tenantUserId
      )
        userIds.push(item.payload.tenantUserId);
    }
    const displayNames = await this.loadDisplayNames(userIds);
    if (event.eventType === 'contract.activated' && !conversation) {
      conversation = ConversationEntity.create({
        kind: ConversationKind.GROUP,
        contextType: ConversationContextType.CONTRACT,
        contextId: event.payload.contractId,
        createdByUserId: event.payload.landlordId,
      });
      await this.conversations.save(conversation, context);
      await this.activateMember(
        conversation.id,
        event.payload.landlordId,
        ConversationMemberRole.ADMIN,
        event.occurredAt,
        displayNames,
        context,
        changes,
      );
      for (const userId of new Set(event.payload.tenantUserIds)) {
        if (userId !== event.payload.landlordId) {
          await this.activateMember(
            conversation.id,
            userId,
            ConversationMemberRole.MEMBER,
            event.occurredAt,
            displayNames,
            context,
            changes,
          );
        }
      }
    }
    if (!conversation) return changes;
    if (conversation.kind !== ConversationKind.GROUP) {
      throw new ValidationException('Contract context must be a group');
    }
    for (const pendingEvent of pending) {
      if (
        pendingEvent.eventType !== 'contract.activated' &&
        new Date(pendingEvent.occurredAt) >= new Date(activation.occurredAt)
      ) {
        await this.applyMemberEvent(
          pendingEvent,
          conversation.id,
          displayNames,
          context,
          changes,
        );
      }
      await this.events.markApplied(pendingEvent.id, context);
    }
    return changes;
  }

  private async applyMemberEvent(
    event: Exclude<ContractContextChange, { eventType: 'contract.activated' }>,
    conversationId: Uuid,
    displayNames: Map<string, string>,
    context: TransactionContext,
    changes: ContractMembershipChange[],
  ): Promise<void> {
    const userId = event.payload.tenantUserId;
    if (!userId) return;
    if (
      await this.events.hasLaterApplied(
        event.payload.contractId,
        userId,
        event.occurredAt,
        event.id,
        context,
      )
    )
      return;
    if (event.eventType === 'contract_member.left') {
      const member = await this.members.findByParticipantForUpdate(
        conversationId,
        { participantType: ConversationParticipantType.USER, userId },
        context,
      );
      if (!member) return;
      if (member.status === ConversationMemberStatus.READ_ONLY) return;
      const leftAt = new Date(event.occurredAt);
      const sequence = await this.messages.latestSequenceAtOrBefore(
        conversationId,
        leftAt,
        context,
      );
      member.markReadOnly(leftAt, sequence);
      await this.members.save(member, context);
      changes.push({ userId, conversationId, active: false });
      return;
    }
    await this.activateMember(
      conversationId,
      userId,
      ConversationMemberRole.MEMBER,
      event.occurredAt,
      displayNames,
      context,
      changes,
    );
  }

  private async activateMember(
    conversationId: Uuid,
    userId: Uuid,
    role: ConversationMemberRole.ADMIN | ConversationMemberRole.MEMBER,
    occurredAt: string,
    displayNames: Map<string, string>,
    context: TransactionContext,
    changes: ContractMembershipChange[],
  ): Promise<void> {
    const existing = await this.members.findByParticipantForUpdate(
      conversationId,
      { participantType: ConversationParticipantType.USER, userId },
      context,
    );
    if (existing?.status === ConversationMemberStatus.ACTIVE) return;
    const sequence = await this.messages.latestSequenceAtOrBefore(
      conversationId,
      new Date(occurredAt),
      context,
    );
    const displayName = displayNames.get(userId.toLowerCase());
    if (!displayName)
      throw new ValidationException('User display name is unavailable');
    if (existing) {
      existing.reactivate(new Date(occurredAt), sequence, displayName);
      await this.members.save(existing, context);
    } else {
      await this.members.save(
        ConversationMemberEntity.create({
          conversationId,
          participantType: ConversationParticipantType.USER,
          userId,
          displayName,
          role,
          joinedAt: new Date(occurredAt),
          lastReadSequence: sequence,
        }),
        context,
      );
    }
    changes.push({ userId, conversationId, active: true });
  }

  private async loadDisplayNames(
    userIds: Uuid[],
  ): Promise<Map<string, string>> {
    const unique = [
      ...new Set(userIds.map((id) => id.toLowerCase())),
    ] as Uuid[];
    if (unique.length === 0) return new Map();
    const names = await this.userLookup.findDisplayNames(unique);
    for (const id of unique) {
      if (!names.get(id)?.trim()) {
        throw new ValidationException(
          'One or more users do not exist or are unavailable',
        );
      }
    }
    return names;
  }
}
