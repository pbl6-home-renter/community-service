import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConversationMemberEntity } from 'modules/conversation-member/domain/entities/conversation-member.entity';
import { ConversationMemberRole } from 'modules/conversation-member/domain/enums/conversation-member-role.enum';
import { ConversationMemberStatus } from 'modules/conversation-member/domain/enums/conversation-member-status.enum';
import { ConversationParticipantType } from 'modules/conversation-member/domain/enums/conversation-participant-type.enum';
import { CONVERSATION_MEMBER_DI_TOKEN } from 'modules/conversation-member/conversation-member.di-token';
import { ConversationMemberRepository } from 'modules/conversation-member/domain/repositories/conversation-member.repository';
import { ConversationMemberNotFoundException } from 'modules/conversation-member/domain/exceptions/conversation-member-not-found.exception';
import { MessageEntity } from 'modules/message/domain/entities/message.entity';
import { MessageType } from 'modules/message/domain/enums/message-type.enum';
import { MessageRepository } from 'modules/message/domain/repositories/message.repository';
import { MessagePayload } from 'modules/message/domain/types/message-payload.type';
import { AdminTransferredMessagePayload } from 'modules/message/domain/value-objects/admin-transferred-message-payload.vo';
import { MemberKickedMessagePayload } from 'modules/message/domain/value-objects/member-kicked-message-payload.vo';
import { MemberLeftMessagePayload } from 'modules/message/domain/value-objects/member-left-message-payload.vo';
import { MESSAGE_DI_TOKEN } from 'modules/message/message.di-token';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationEntity } from '../../../domain/entities/conversation.entity';
import { ConversationKind } from '../../../domain/enums/conversation-kind.enum';
import { ConversationForbiddenException } from '../../../domain/exceptions/conversation-forbidden.exception';
import { ConversationGroupMustRetainActiveMemberException } from '../../../domain/exceptions/conversation-group-must-retain-active-member.exception';
import { ConversationNotFoundException } from '../../../domain/exceptions/conversation-not-found.exception';
import { ConversationRepository } from '../../../domain/repositories/conversation.repository';
import { CONVERSATION_DI_TOKEN } from '../../../conversation.di-token';
import { ConversationMemberDepartureCommand } from './conversation-member-departure.command';
import { ChatRealtimePort } from '../../ports/chat-realtime.port';

@CommandHandler(ConversationMemberDepartureCommand)
export class ConversationMemberDepartureCommandHandler implements ICommandHandler<
  ConversationMemberDepartureCommand,
  void
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
    @Inject(CONVERSATION_DI_TOKEN.CHAT_REALTIME)
    private readonly realtime: ChatRealtimePort,
  ) {}

  async execute(command: ConversationMemberDepartureCommand): Promise<void> {
    const systemMessages: MessageEntity[] = [];
    await this.unitOfWork.run(async (context) => {
      const conversation = await this.lockGroup(
        command.conversationId,
        context,
      );
      const actor = await this.getActiveMember(
        conversation.id,
        command.actorUserId,
        context,
      );

      if (
        command.action === 'kick' &&
        actor.role !== ConversationMemberRole.ADMIN
      ) {
        throw new ConversationForbiddenException();
      }
      if (
        command.action === 'kick' &&
        command.actorUserId.toLowerCase() === command.targetUserId.toLowerCase()
      ) {
        throw new ValidationException(
          'Use the leave endpoint to remove yourself from a group',
        );
      }

      const target = await this.getActiveTarget(
        conversation.id,
        command.targetUserId,
        context,
      );
      const activeMembers = await this.members.findActiveUserMembersForUpdate(
        conversation.id,
        context,
      );
      const remainingMembers = activeMembers.filter(
        (member) => member.id !== target.id,
      );
      if (remainingMembers.length === 0) {
        throw new ConversationGroupMustRetainActiveMemberException();
      }

      const successor =
        target.role === ConversationMemberRole.ADMIN &&
        !remainingMembers.some(
          (member) => member.role === ConversationMemberRole.ADMIN,
        )
          ? remainingMembers[0]
          : null;

      if (successor) {
        successor.changeRole(ConversationMemberRole.ADMIN);
        await this.members.save(successor, context);
      }

      const latestSequence = await this.messages.latestSequenceForUpdate(
        conversation.id,
        context,
      );
      const systemMember = await this.getOrCreateSystemMember(
        conversation,
        latestSequence,
        context,
      );

      const departurePayload =
        command.action === 'kick'
          ? MemberKickedMessagePayload.create(
              command.actorUserId,
              actor.displayName,
              {
                userId: target.userId!,
                displayName: target.displayName,
              },
            ).toJSON()
          : MemberLeftMessagePayload.create(
              command.actorUserId,
              actor.displayName,
              {
                userId: target.userId!,
                displayName: target.displayName,
              },
            ).toJSON();
      const departureMessage = await this.saveSystemMessage(
        conversation.id,
        systemMember,
        departurePayload,
        context,
      );
      systemMessages.push(departureMessage);
      let leftSequence = departureMessage.sequence;

      if (successor) {
        const transferPayload = AdminTransferredMessagePayload.create(
          command.actorUserId,
          actor.displayName,
          {
            userId: successor.userId!,
            displayName: successor.displayName,
          },
        ).toJSON();
        const transferMessage = await this.saveSystemMessage(
          conversation.id,
          systemMember,
          transferPayload,
          context,
        );
        systemMessages.push(transferMessage);
        leftSequence = transferMessage.sequence;
      }

      target.markReadOnly(new Date(), leftSequence);
      await this.members.save(target, context);
    });
    this.realtime.membershipRevoked(
      command.targetUserId,
      command.conversationId,
    );
    for (const message of systemMessages)
      this.realtime.messageCreated(message, null);
  }

  private async lockGroup(
    conversationId: Uuid,
    context: TransactionContext,
  ): Promise<ConversationEntity> {
    const conversation = await this.conversations.findByIdForUpdate(
      conversationId,
      context,
    );
    if (!conversation) throw new ConversationNotFoundException();
    if (conversation.kind !== ConversationKind.GROUP) {
      throw new ValidationException(
        'Members can only leave or be removed from group conversations',
      );
    }
    return conversation;
  }

  private async getActiveMember(
    conversationId: Uuid,
    userId: Uuid,
    context: TransactionContext,
  ): Promise<ConversationMemberEntity> {
    const member = await this.members.findByParticipantForUpdate(
      conversationId,
      { participantType: ConversationParticipantType.USER, userId },
      context,
    );
    if (!member || member.status !== ConversationMemberStatus.ACTIVE) {
      throw new ConversationForbiddenException();
    }
    return member;
  }

  private async getActiveTarget(
    conversationId: Uuid,
    userId: Uuid,
    context: TransactionContext,
  ): Promise<ConversationMemberEntity> {
    const member = await this.members.findByParticipantForUpdate(
      conversationId,
      { participantType: ConversationParticipantType.USER, userId },
      context,
    );
    if (!member || member.status !== ConversationMemberStatus.ACTIVE) {
      throw new ConversationMemberNotFoundException();
    }
    return member;
  }

  private async saveSystemMessage(
    conversationId: Uuid,
    systemMember: ConversationMemberEntity,
    payload: MessagePayload,
    context: TransactionContext,
  ): Promise<MessageEntity> {
    const sequence = await this.messages.nextSequenceForUpdate(
      conversationId,
      context,
    );
    const message = MessageEntity.create({
      conversationId,
      senderMemberId: systemMember.id,
      senderNameSnapshot: systemMember.displayName,
      type: MessageType.SYSTEM,
      payload,
      sequence,
    });
    await this.messages.save(message, context);
    return message;
  }

  private async getOrCreateSystemMember(
    conversation: ConversationEntity,
    latestSequence: string,
    context: TransactionContext,
  ): Promise<ConversationMemberEntity> {
    const identity = {
      participantType: ConversationParticipantType.SYSTEM,
      systemParticipantKey: 'system',
    } as const;
    const existing = await this.members.findByParticipantForUpdate(
      conversation.id,
      identity,
      context,
    );
    if (existing) return existing;

    const systemMember = ConversationMemberEntity.create({
      conversationId: conversation.id,
      participantType: ConversationParticipantType.SYSTEM,
      systemParticipantKey: identity.systemParticipantKey,
      displayName: 'System',
      role: ConversationMemberRole.SYSTEM,
      joinedAt: conversation.createdAt,
      lastReadSequence: latestSequence,
    });
    await this.members.save(systemMember, context);
    return systemMember;
  }
}
