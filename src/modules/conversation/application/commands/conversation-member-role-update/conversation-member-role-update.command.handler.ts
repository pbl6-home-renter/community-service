import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConversationMemberEntity } from 'modules/conversation-member/domain/entities/conversation-member.entity';
import { ConversationMemberRole } from 'modules/conversation-member/domain/enums/conversation-member-role.enum';
import { ConversationMemberStatus } from 'modules/conversation-member/domain/enums/conversation-member-status.enum';
import { ConversationParticipantType } from 'modules/conversation-member/domain/enums/conversation-participant-type.enum';
import { CONVERSATION_MEMBER_DI_TOKEN } from 'modules/conversation-member/conversation-member.di-token';
import { ConversationMemberNotFoundException } from 'modules/conversation-member/domain/exceptions/conversation-member-not-found.exception';
import { ConversationMemberRepository } from 'modules/conversation-member/domain/repositories/conversation-member.repository';
import { MessageEntity } from 'modules/message/domain/entities/message.entity';
import { MessageType } from 'modules/message/domain/enums/message-type.enum';
import { MessagePayload } from 'modules/message/domain/types/message-payload.type';
import { MessageRepository } from 'modules/message/domain/repositories/message.repository';
import { MemberRoleChangedMessagePayload } from 'modules/message/domain/value-objects/member-role-changed-message-payload.vo';
import { MESSAGE_DI_TOKEN } from 'modules/message/message.di-token';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationEntity } from '../../../domain/entities/conversation.entity';
import { ConversationKind } from '../../../domain/enums/conversation-kind.enum';
import { ConversationForbiddenException } from '../../../domain/exceptions/conversation-forbidden.exception';
import { ConversationLastAdminCannotBeDemotedException } from '../../../domain/exceptions/conversation-last-admin-cannot-be-demoted.exception';
import { ConversationNotFoundException } from '../../../domain/exceptions/conversation-not-found.exception';
import { ConversationRepository } from '../../../domain/repositories/conversation.repository';
import { CONVERSATION_DI_TOKEN } from '../../../conversation.di-token';
import { ConversationMemberRoleUpdateCommand } from './conversation-member-role-update.command';
import { ChatRealtimePort } from '../../ports/chat-realtime.port';

@CommandHandler(ConversationMemberRoleUpdateCommand)
export class ConversationMemberRoleUpdateCommandHandler implements ICommandHandler<
  ConversationMemberRoleUpdateCommand,
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

  async execute(command: ConversationMemberRoleUpdateCommand): Promise<void> {
    let systemMessage: MessageEntity | null = null;
    await this.unitOfWork.run(async (context) => {
      const conversation = await this.conversations.findByIdForUpdate(
        command.conversationId,
        context,
      );
      if (!conversation) throw new ConversationNotFoundException();
      if (conversation.kind !== ConversationKind.GROUP) {
        throw new ValidationException(
          'Member roles can only be changed in group conversations',
        );
      }

      const actor = await this.findMemberForUpdate(
        command.conversationId,
        command.actorUserId,
        context,
      );
      if (
        !actor ||
        actor.status !== ConversationMemberStatus.ACTIVE ||
        actor.role !== ConversationMemberRole.ADMIN
      ) {
        throw new ConversationForbiddenException();
      }

      const target = await this.findMemberForUpdate(
        command.conversationId,
        command.targetUserId,
        context,
      );
      if (!target || target.status !== ConversationMemberStatus.ACTIVE) {
        throw new ConversationMemberNotFoundException();
      }

      const oldRole = target.role;
      if (oldRole === command.role) return;

      if (
        oldRole === ConversationMemberRole.ADMIN &&
        command.role === ConversationMemberRole.MEMBER
      ) {
        const activeMembers = await this.members.findActiveUserMembersForUpdate(
          command.conversationId,
          context,
        );
        const activeAdminCount = activeMembers.filter(
          (member) => member.role === ConversationMemberRole.ADMIN,
        ).length;
        if (activeAdminCount <= 1) {
          throw new ConversationLastAdminCannotBeDemotedException();
        }
      }

      target.changeRole(command.role);
      await this.members.save(target, context);

      const latestSequence = await this.messages.latestSequenceForUpdate(
        command.conversationId,
        context,
      );
      const systemMember = await this.getOrCreateSystemMember(
        conversation,
        latestSequence,
        context,
      );
      const payload = MemberRoleChangedMessagePayload.create(
        command.actorUserId,
        { userId: target.userId!, displayName: target.displayName },
        oldRole === ConversationMemberRole.ADMIN ? 'admin' : 'member',
        command.role === ConversationMemberRole.ADMIN ? 'admin' : 'member',
      ).toJSON();
      systemMessage = await this.saveSystemMessage(
        command.conversationId,
        systemMember,
        payload,
        context,
      );
    });
    if (systemMessage) this.realtime.messageCreated(systemMessage, null);
  }

  private async findMemberForUpdate(
    conversationId: Uuid,
    userId: Uuid,
    context: TransactionContext,
  ): Promise<ConversationMemberEntity | null> {
    return this.members.findByParticipantForUpdate(
      conversationId,
      { participantType: ConversationParticipantType.USER, userId },
      context,
    );
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
      displayName: 'Hệ thống',
      role: ConversationMemberRole.SYSTEM,
      joinedAt: conversation.createdAt,
      lastReadSequence: latestSequence,
    });
    await this.members.save(systemMember, context);
    return systemMember;
  }
}
