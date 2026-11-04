import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { QueryFailedError } from 'typeorm';
import { CONVERSATION_MEMBER_DI_TOKEN } from 'modules/conversation-member/conversation-member.di-token';
import { ConversationMemberEntity } from 'modules/conversation-member/domain/entities/conversation-member.entity';
import { ConversationMemberRepository } from 'modules/conversation-member/domain/repositories/conversation-member.repository';
import { ConversationMemberRole } from 'modules/conversation-member/domain/enums/conversation-member-role.enum';
import { ConversationMemberStatus } from 'modules/conversation-member/domain/enums/conversation-member-status.enum';
import { ConversationParticipantType } from 'modules/conversation-member/domain/enums/conversation-participant-type.enum';
import { MESSAGE_DI_TOKEN } from 'modules/message/message.di-token';
import { MessageRepository } from 'modules/message/domain/repositories/message.repository';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { PostgresErrorCode } from 'shared/infrastructure/database/postgres-error-code';
import { ConversationEntity } from '../../../domain/entities/conversation.entity';
import { ConversationKind } from '../../../domain/enums/conversation-kind.enum';
import { ConversationGroupMembersInsufficientException } from '../../../domain/exceptions/conversation-group-members-insufficient.exception';
import { ConversationTitle } from '../../../domain/value-objects/conversation-title.vo';
import { ConversationRepository } from '../../../domain/repositories/conversation.repository';
import { CONVERSATION_DI_TOKEN } from '../../../conversation.di-token';
import { ConversationCreateCommand } from './conversation-create.command';
import { ConversationCreateResult } from './conversation-create.result';
import { ConversationUserLookup } from '../../ports/conversation-user-lookup.port';
import { ChatRealtimePort } from '../../ports/chat-realtime.port';

@CommandHandler(ConversationCreateCommand)
export class ConversationCreateCommandHandler implements ICommandHandler<
  ConversationCreateCommand,
  ConversationCreateResult
> {
  constructor(
    @Inject(CONVERSATION_DI_TOKEN.REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(CONVERSATION_MEMBER_DI_TOKEN.REPOSITORY)
    private readonly members: ConversationMemberRepository,
    @Inject(MESSAGE_DI_TOKEN.REPOSITORY)
    private readonly messages: MessageRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(CONVERSATION_DI_TOKEN.USER_LOOKUP)
    private readonly userLookup: ConversationUserLookup,
    @Inject(CONVERSATION_DI_TOKEN.CHAT_REALTIME)
    private readonly realtime: ChatRealtimePort,
  ) {}

  async execute(
    command: ConversationCreateCommand,
  ): Promise<ConversationCreateResult> {
    if (!Object.values(ConversationKind).includes(command.kind)) {
      throw new ValidationException('Conversation kind is invalid');
    }

    if (command.kind === ConversationKind.GROUP) {
      this.assertGroupHasEnoughMembers(command);
    }

    const requestedUserIds =
      command.kind === ConversationKind.DIRECT
        ? command.recipientUserId
          ? [command.callerUserId, command.recipientUserId]
          : []
        : [command.callerUserId, ...command.memberUserIds];
    const displayNames = await this.getDisplayNames(requestedUserIds);

    let result: ConversationCreateResult;
    if (command.kind === ConversationKind.DIRECT) {
      result = await this.createOrReopenDirect(command, displayNames);
    } else if (command.kind === ConversationKind.GROUP) {
      result = await this.createGroup(command, displayNames);
    } else {
      throw new ValidationException('Conversation kind is invalid');
    }
    for (const member of result.members) {
      this.realtime.membershipActivated(member.userId!, result.conversation.id);
    }
    return result;
  }

  /** A free group needs at least two distinct users besides the creator. */
  private assertGroupHasEnoughMembers(
    command: ConversationCreateCommand,
  ): void {
    const callerUserId = command.callerUserId.toLowerCase();
    const otherUserIds = new Set(
      command.memberUserIds
        .map((userId) => userId.toLowerCase())
        .filter((userId) => userId !== callerUserId),
    );
    if (otherUserIds.size < 2) {
      throw new ConversationGroupMembersInsufficientException();
    }
  }

  private async getDisplayNames(userIds: Uuid[]): Promise<Map<string, string>> {
    const uniqueUserIds = [
      ...new Set(userIds.map((userId) => userId.toLowerCase())),
    ];
    if (uniqueUserIds.length === 0) return new Map();

    const displayNames = await this.userLookup.findDisplayNames(
      uniqueUserIds as Uuid[],
    );
    const missingUserIds = uniqueUserIds.filter((userId) => {
      const displayName = displayNames.get(userId);
      return !displayName || displayName.trim().length === 0;
    });
    if (missingUserIds.length > 0) {
      throw new ValidationException(
        'One or more users do not exist or are unavailable',
      );
    }
    return displayNames;
  }

  private async createOrReopenDirect(
    command: ConversationCreateCommand,
    displayNames: Map<string, string>,
  ): Promise<ConversationCreateResult> {
    const recipientUserId = command.recipientUserId;
    if (!recipientUserId) {
      throw new ValidationException(
        'Direct conversation requires a recipient user',
      );
    }
    if (recipientUserId.toLowerCase() === command.callerUserId.toLowerCase()) {
      throw new ValidationException(
        'Direct conversation cannot target the caller',
      );
    }

    const directPairKey = [command.callerUserId, recipientUserId]
      .map((userId) => userId.toLowerCase())
      .sort()
      .join(':');

    try {
      return await this.unitOfWork.run(async (context) => {
        const existing = await this.conversations.findByDirectPairKeyForUpdate(
          directPairKey,
          context,
        );
        if (!existing) {
          const conversation = ConversationEntity.create({
            kind: ConversationKind.DIRECT,
            directPairKey,
            createdByUserId: command.callerUserId,
          });
          const members = [
            this.createMember(
              conversation.id,
              command.callerUserId,
              displayNames.get(command.callerUserId.toLowerCase())!,
              ConversationMemberRole.MEMBER,
            ),
            this.createMember(
              conversation.id,
              recipientUserId,
              displayNames.get(recipientUserId.toLowerCase())!,
              ConversationMemberRole.MEMBER,
            ),
          ];
          await this.conversations.save(conversation, context);
          for (const member of members) {
            await this.members.save(member, context);
          }
          return {
            conversation,
            members,
            unreadCount: 0,
            wasCreated: true,
          };
        }

        const latestSequence = await this.messages.latestSequenceForUpdate(
          existing.id,
          context,
        );
        const callerMember = await this.getOrReactivateMember(
          existing.id,
          command.callerUserId,
          displayNames.get(command.callerUserId.toLowerCase())!,
          latestSequence,
          context,
        );
        const recipientMember = await this.getOrReactivateMember(
          existing.id,
          recipientUserId,
          displayNames.get(recipientUserId.toLowerCase())!,
          latestSequence,
          context,
        );
        const unreadCount = await this.messages.countUnread(
          existing.id,
          callerMember.id,
          callerMember.lastReadSequence,
        );

        return {
          conversation: existing,
          members: [callerMember, recipientMember],
          unreadCount,
          wasCreated: false,
        };
      });
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code ===
          PostgresErrorCode.UNIQUE_VIOLATION &&
        (error.driverError as { constraint?: string }).constraint ===
          'UQ_conversations_direct_pair_key'
      ) {
        return this.resolveDirectAfterConflict(
          directPairKey,
          command,
          displayNames,
        );
      }
      throw error;
    }
  }

  private async resolveDirectAfterConflict(
    directPairKey: string,
    command: ConversationCreateCommand,
    displayNames: Map<string, string>,
  ): Promise<ConversationCreateResult> {
    return this.unitOfWork.run(async (context) => {
      const conversation =
        await this.conversations.findByDirectPairKeyForUpdate(
          directPairKey,
          context,
        );
      if (!conversation)
        throw new Error('Direct conversation conflict was not resolved');

      const latestSequence = await this.messages.latestSequenceForUpdate(
        conversation.id,
        context,
      );
      const callerMember = await this.getOrReactivateMember(
        conversation.id,
        command.callerUserId,
        displayNames.get(command.callerUserId.toLowerCase())!,
        latestSequence,
        context,
      );
      const recipientMember = await this.getOrReactivateMember(
        conversation.id,
        command.recipientUserId!,
        displayNames.get(command.recipientUserId!.toLowerCase())!,
        latestSequence,
        context,
      );
      const unreadCount = await this.messages.countUnread(
        conversation.id,
        callerMember.id,
        callerMember.lastReadSequence,
      );
      return {
        conversation,
        members: [callerMember, recipientMember],
        unreadCount,
        wasCreated: false,
      };
    });
  }

  private async createGroup(
    command: ConversationCreateCommand,
    displayNames: Map<string, string>,
  ): Promise<ConversationCreateResult> {
    return this.unitOfWork.run(async (context) => {
      // Insertion order: creator first, then members in request order.
      const uniqueUserIds = new Map<string, Uuid>();
      for (const userId of [command.callerUserId, ...command.memberUserIds]) {
        const normalizedUserId = userId.toLowerCase();
        uniqueUserIds.set(normalizedUserId, normalizedUserId as Uuid);
      }
      const conversation = ConversationEntity.create({
        kind: ConversationKind.GROUP,
        title:
          command.title ??
          ConversationTitle.fromMemberNames(
            [...uniqueUserIds.keys()].map((userId) =>
              displayNames.get(userId)!,
            ),
          ),
        createdByUserId: command.callerUserId,
      });
      const members = [...uniqueUserIds.values()].map((userId) =>
        this.createMember(
          conversation.id,
          userId,
          displayNames.get(userId.toLowerCase())!,
          userId.toLowerCase() === command.callerUserId.toLowerCase()
            ? ConversationMemberRole.ADMIN
            : ConversationMemberRole.MEMBER,
        ),
      );

      await this.conversations.save(conversation, context);
      for (const member of members) {
        await this.members.save(member, context);
      }
      return { conversation, members, unreadCount: 0, wasCreated: true };
    });
  }

  private createMember(
    conversationId: Uuid,
    userId: Uuid,
    displayName: string,
    role: ConversationMemberRole.ADMIN | ConversationMemberRole.MEMBER,
    lastReadSequence = '0',
  ): ConversationMemberEntity {
    return ConversationMemberEntity.create({
      conversationId,
      participantType: ConversationParticipantType.USER,
      userId,
      displayName,
      role,
      joinedAt: new Date(),
      lastReadSequence,
    });
  }

  private async getOrReactivateMember(
    conversationId: Uuid,
    userId: Uuid,
    displayName: string,
    latestSequence: string,
    context: TransactionContext,
  ): Promise<ConversationMemberEntity> {
    const identity = {
      participantType: ConversationParticipantType.USER,
      userId,
    } as const;
    const existing = await this.members.findByParticipantForUpdate(
      conversationId,
      identity,
      context,
    );
    if (!existing) {
      const member = this.createMember(
        conversationId,
        userId,
        displayName,
        ConversationMemberRole.MEMBER,
        latestSequence,
      );
      await this.members.save(member, context);
      return member;
    }
    if (existing.status === ConversationMemberStatus.READ_ONLY) {
      existing.reactivate(new Date(), latestSequence, displayName);
      await this.members.save(existing, context);
      return (
        (await this.members.findByParticipantForUpdate(
          conversationId,
          identity,
          context,
        )) ?? existing
      );
    }
    return existing;
  }
}
