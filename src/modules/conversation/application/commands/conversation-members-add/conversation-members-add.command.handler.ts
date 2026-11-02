import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConversationMemberEntity } from 'modules/conversation-member/domain/entities/conversation-member.entity';
import { ConversationMemberRole } from 'modules/conversation-member/domain/enums/conversation-member-role.enum';
import { ConversationMemberStatus } from 'modules/conversation-member/domain/enums/conversation-member-status.enum';
import { ConversationParticipantType } from 'modules/conversation-member/domain/enums/conversation-participant-type.enum';
import { CONVERSATION_MEMBER_DI_TOKEN } from 'modules/conversation-member/conversation-member.di-token';
import { ConversationMemberRepository } from 'modules/conversation-member/domain/repositories/conversation-member.repository';
import { MessageEntity } from 'modules/message/domain/entities/message.entity';
import { MessageType } from 'modules/message/domain/enums/message-type.enum';
import { MessageRepository } from 'modules/message/domain/repositories/message.repository';
import { MESSAGE_DI_TOKEN } from 'modules/message/message.di-token';
import { MembersAddedMessagePayload } from 'modules/message/domain/value-objects/members-added-message-payload.vo';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationForbiddenException } from '../../../domain/exceptions/conversation-forbidden.exception';
import { ConversationNotFoundException } from '../../../domain/exceptions/conversation-not-found.exception';
import { ConversationKind } from '../../../domain/enums/conversation-kind.enum';
import { ConversationRepository } from '../../../domain/repositories/conversation.repository';
import { CONVERSATION_DI_TOKEN } from '../../../conversation.di-token';
import { ConversationUserLookup } from '../../ports/conversation-user-lookup.port';
import { ConversationMembersAddCommand } from './conversation-members-add.command';
import { ChatRealtimePort } from '../../ports/chat-realtime.port';

@CommandHandler(ConversationMembersAddCommand)
export class ConversationMembersAddCommandHandler implements ICommandHandler<
  ConversationMembersAddCommand,
  ConversationMemberEntity[]
> {
  constructor(
    @Inject(CONVERSATION_DI_TOKEN.REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(CONVERSATION_MEMBER_DI_TOKEN.REPOSITORY)
    private readonly members: ConversationMemberRepository,
    @Inject(MESSAGE_DI_TOKEN.REPOSITORY)
    private readonly messages: MessageRepository,
    @Inject(CONVERSATION_DI_TOKEN.USER_LOOKUP)
    private readonly userLookup: ConversationUserLookup,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(CONVERSATION_DI_TOKEN.CHAT_REALTIME)
    private readonly realtime: ChatRealtimePort,
  ) {}

  async execute(
    command: ConversationMembersAddCommand,
  ): Promise<ConversationMemberEntity[]> {
    const normalizedUserIds = [
      ...new Set(command.userIds.map((userId) => userId.toLowerCase())),
    ] as Uuid[];
    if (normalizedUserIds.length !== command.userIds.length) {
      throw new ValidationException(
        'Duplicate member user IDs are not allowed',
      );
    }

    await this.ensureCallerIsGroupAdmin(command);
    const displayNames = await this.loadDisplayNames(normalizedUserIds);

    let systemMessage: MessageEntity | null = null;
    const added = await this.unitOfWork.run(async (context) => {
      const conversation = await this.conversations.findByIdForUpdate(
        command.conversationId,
        context,
      );
      if (!conversation) throw new ConversationNotFoundException();
      if (conversation.kind !== ConversationKind.GROUP) {
        throw new ValidationException(
          'Members can only be added to group conversations',
        );
      }

      const caller = await this.members.findByParticipantForUpdate(
        command.conversationId,
        {
          participantType: ConversationParticipantType.USER,
          userId: command.callerUserId,
        },
        context,
      );
      if (
        !caller ||
        caller.status !== ConversationMemberStatus.ACTIVE ||
        caller.role !== ConversationMemberRole.ADMIN
      ) {
        throw new ConversationForbiddenException();
      }

      const latestSequence = await this.messages.latestSequenceForUpdate(
        command.conversationId,
        context,
      );
      const addedMembers: ConversationMemberEntity[] = [];
      for (const userId of normalizedUserIds) {
        const member = await this.addOrReactivateMember(
          command.conversationId,
          userId,
          displayNames.get(userId.toLowerCase())!,
          latestSequence,
          context,
        );
        addedMembers.push(member);
      }

      const systemMember = await this.getOrCreateSystemMember(
        command.conversationId,
        latestSequence,
        context,
      );
      const sequence = await this.messages.nextSequenceForUpdate(
        command.conversationId,
        context,
      );
      const payload = MembersAddedMessagePayload.create({
        actorUserId: command.callerUserId,
        members: addedMembers.map((member, index) => ({
          userId: normalizedUserIds[index],
          displayName: member.displayName,
        })),
      });
      systemMessage = MessageEntity.create({
        conversationId: command.conversationId,
        senderMemberId: systemMember.id,
        senderNameSnapshot: systemMember.displayName,
        type: MessageType.SYSTEM,
        payload: payload.toJSON(),
        sequence,
      });
      await this.messages.save(systemMessage, context);
      return addedMembers;
    });
    if (systemMessage) this.realtime.messageCreated(systemMessage, null);
    for (const member of added)
      this.realtime.membershipActivated(member.userId!, command.conversationId);
    return added;
  }

  private async ensureCallerIsGroupAdmin(
    command: ConversationMembersAddCommand,
  ): Promise<void> {
    const conversation = await this.conversations.findById(
      command.conversationId,
    );
    if (!conversation) throw new ConversationNotFoundException();
    if (conversation.kind !== ConversationKind.GROUP) {
      throw new ValidationException(
        'Members can only be added to group conversations',
      );
    }

    const caller = await this.members.findByParticipant(
      command.conversationId,
      {
        participantType: ConversationParticipantType.USER,
        userId: command.callerUserId,
      },
    );
    if (
      !caller ||
      caller.status !== ConversationMemberStatus.ACTIVE ||
      caller.role !== ConversationMemberRole.ADMIN
    ) {
      throw new ConversationForbiddenException();
    }
  }

  private async loadDisplayNames(
    userIds: Uuid[],
  ): Promise<Map<string, string>> {
    const displayNames = await this.userLookup.findDisplayNames(userIds);
    for (const userId of userIds) {
      const displayName = displayNames.get(userId.toLowerCase());
      if (!displayName || displayName.trim().length === 0) {
        throw new ValidationException(
          'One or more users do not exist or are unavailable',
        );
      }
    }
    return displayNames;
  }

  private async addOrReactivateMember(
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
    if (existing?.status === ConversationMemberStatus.ACTIVE) {
      throw new ValidationException(
        'User is already an active conversation member',
      );
    }

    if (existing) {
      existing.reactivate(new Date(), latestSequence, displayName);
      await this.members.save(existing, context);
      return existing;
    }

    const member = ConversationMemberEntity.create({
      conversationId,
      participantType: ConversationParticipantType.USER,
      userId,
      displayName,
      role: ConversationMemberRole.MEMBER,
      joinedAt: new Date(),
      lastReadSequence: latestSequence,
    });
    await this.members.save(member, context);
    return member;
  }

  private async getOrCreateSystemMember(
    conversationId: Uuid,
    latestSequence: string,
    context: TransactionContext,
  ): Promise<ConversationMemberEntity> {
    const identity = {
      participantType: ConversationParticipantType.SYSTEM,
      systemParticipantKey: 'system',
    } as const;
    const existing = await this.members.findByParticipantForUpdate(
      conversationId,
      identity,
      context,
    );
    if (existing) return existing;

    const systemMember = ConversationMemberEntity.create({
      conversationId,
      participantType: ConversationParticipantType.SYSTEM,
      systemParticipantKey: identity.systemParticipantKey,
      displayName: 'Hệ thống',
      role: ConversationMemberRole.SYSTEM,
      joinedAt: new Date(),
      lastReadSequence: latestSequence,
    });
    await this.members.save(systemMember, context);
    return systemMember;
  }
}
