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
import { MessagePayload } from 'modules/message/domain/types/message-payload.type';
import { ConversationAvatarChangedMessagePayload } from 'modules/message/domain/value-objects/conversation-avatar-changed-message-payload.vo';
import { ConversationTitleChangedMessagePayload } from 'modules/message/domain/value-objects/conversation-title-changed-message-payload.vo';
import { MessageRepository } from 'modules/message/domain/repositories/message.repository';
import { MESSAGE_DI_TOKEN } from 'modules/message/message.di-token';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationForbiddenException } from '../../../domain/exceptions/conversation-forbidden.exception';
import { ConversationNotFoundException } from '../../../domain/exceptions/conversation-not-found.exception';
import { ConversationKind } from '../../../domain/enums/conversation-kind.enum';
import { ConversationRepository } from '../../../domain/repositories/conversation.repository';
import { ConversationEntity } from '../../../domain/entities/conversation.entity';
import { CONVERSATION_DI_TOKEN } from '../../../conversation.di-token';
import { ConversationAvatarValidatorPort } from '../../ports/conversation-avatar-validator.port';
import { ConversationMetadataUpdateCommand } from './conversation-metadata-update.command';
import { ChatRealtimePort } from '../../ports/chat-realtime.port';

@CommandHandler(ConversationMetadataUpdateCommand)
export class ConversationMetadataUpdateCommandHandler implements ICommandHandler<
  ConversationMetadataUpdateCommand,
  ConversationEntity
> {
  constructor(
    @Inject(CONVERSATION_DI_TOKEN.REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(CONVERSATION_MEMBER_DI_TOKEN.REPOSITORY)
    private readonly members: ConversationMemberRepository,
    @Inject(MESSAGE_DI_TOKEN.REPOSITORY)
    private readonly messages: MessageRepository,
    @Inject(CONVERSATION_DI_TOKEN.AVATAR_VALIDATOR)
    private readonly avatarValidator: ConversationAvatarValidatorPort,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(CONVERSATION_DI_TOKEN.CHAT_REALTIME)
    private readonly realtime: ChatRealtimePort,
  ) {}

  async execute(
    command: ConversationMetadataUpdateCommand,
  ): Promise<ConversationEntity> {
    const existing = await this.conversations.findById(command.conversationId);
    if (!existing) throw new ConversationNotFoundException();
    this.ensureGroupAdmin(existing, await this.findActor(command));

    if (command.avatarMediaId) {
      await this.avatarValidator.assertAttachable(
        command.avatarMediaId,
        command.conversationId,
      );
    }

    const systemMessages: MessageEntity[] = [];
    const result = await this.unitOfWork.run(async (context) => {
      const conversation = await this.conversations.findByIdForUpdate(
        command.conversationId,
        context,
      );
      if (!conversation) throw new ConversationNotFoundException();

      const actor = await this.findActorForUpdate(command, context);
      this.ensureGroupAdmin(conversation, actor);

      const oldTitle = conversation.title?.value ?? null;
      const oldAvatarMediaId = conversation.avatarMediaId;
      const title =
        command.title === undefined ? conversation.title : command.title;
      const avatarMediaId =
        command.avatarMediaId === undefined
          ? conversation.avatarMediaId
          : command.avatarMediaId;
      const updated = conversation.withGroupMetadata(title, avatarMediaId);
      const titleChanged = oldTitle !== (updated.title?.value ?? null);
      const avatarChanged = oldAvatarMediaId !== updated.avatarMediaId;

      if (!titleChanged && !avatarChanged) return conversation;

      await this.conversations.save(updated, context);
      const latestSequence = await this.messages.latestSequenceForUpdate(
        conversation.id,
        context,
      );
      const systemMember = await this.getOrCreateSystemMember(
        conversation,
        latestSequence,
        context,
      );

      if (titleChanged) {
        const payload = ConversationTitleChangedMessagePayload.create(
          command.actorUserId,
          actor.displayName,
          oldTitle,
          updated.title?.value ?? null,
        ).toJSON();
        systemMessages.push(
          await this.saveSystemMessage(
            conversation.id,
            systemMember,
            payload,
            context,
          ),
        );
      }
      if (avatarChanged) {
        const payload = ConversationAvatarChangedMessagePayload.create(
          command.actorUserId,
          actor.displayName,
          oldAvatarMediaId,
          updated.avatarMediaId,
        ).toJSON();
        systemMessages.push(
          await this.saveSystemMessage(
            conversation.id,
            systemMember,
            payload,
            context,
          ),
        );
      }
      return updated;
    });
    for (const message of systemMessages)
      this.realtime.messageCreated(message, null);
    return result;
  }

  private async findActor(
    command: ConversationMetadataUpdateCommand,
  ): Promise<ConversationMemberEntity | null> {
    return this.members.findByParticipant(command.conversationId, {
      participantType: ConversationParticipantType.USER,
      userId: command.actorUserId,
    });
  }

  private async findActorForUpdate(
    command: ConversationMetadataUpdateCommand,
    context: TransactionContext,
  ): Promise<ConversationMemberEntity | null> {
    return this.members.findByParticipantForUpdate(
      command.conversationId,
      {
        participantType: ConversationParticipantType.USER,
        userId: command.actorUserId,
      },
      context,
    );
  }

  private ensureGroupAdmin(
    conversation: ConversationEntity,
    actor: ConversationMemberEntity | null,
  ): asserts actor is ConversationMemberEntity {
    if (conversation.kind !== ConversationKind.GROUP) {
      throw new ValidationException(
        'Only group conversations support metadata updates',
      );
    }
    if (
      !actor ||
      actor.status !== ConversationMemberStatus.ACTIVE ||
      actor.role !== ConversationMemberRole.ADMIN
    ) {
      throw new ConversationForbiddenException();
    }
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
