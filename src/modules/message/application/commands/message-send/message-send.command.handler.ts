import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CONVERSATION_MEMBER_DI_TOKEN } from 'modules/conversation-member/conversation-member.di-token';
import { ConversationMemberRepository } from 'modules/conversation-member/domain/repositories/conversation-member.repository';
import { ConversationMemberStatus } from 'modules/conversation-member/domain/enums/conversation-member-status.enum';
import { ConversationParticipantType } from 'modules/conversation-member/domain/enums/conversation-participant-type.enum';
import { CONVERSATION_DI_TOKEN } from 'modules/conversation/conversation.di-token';
import { ConversationRepository } from 'modules/conversation/domain/repositories/conversation.repository';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { MessageEntity } from '../../../domain/entities/message.entity';
import { MessageRepository } from '../../../domain/repositories/message.repository';
import { MessageType } from '../../../domain/enums/message-type.enum';
import { MessageContentInvalidException } from '../../../domain/exceptions/message-content-invalid.exception';
import { MessageMediaValidatorPort } from '../../ports/message-media-validator.port';
import { MessageSendCommand } from './message-send.command';
import { MESSAGE_DI_TOKEN } from '../../../message.di-token';
import { ConversationForbiddenException } from 'modules/conversation/domain/exceptions/conversation-forbidden.exception';
import { MessageConversationNotFoundException } from '../../../domain/exceptions/message-conversation-not-found.exception';
import { ChatRealtimePort } from 'modules/conversation/application/ports/chat-realtime.port';

@CommandHandler(MessageSendCommand)
export class MessageSendCommandHandler implements ICommandHandler<
  MessageSendCommand,
  MessageEntity
> {
  constructor(
    @Inject(CONVERSATION_DI_TOKEN.REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(CONVERSATION_MEMBER_DI_TOKEN.REPOSITORY)
    private readonly members: ConversationMemberRepository,
    @Inject(MESSAGE_DI_TOKEN.REPOSITORY)
    private readonly messages: MessageRepository,
    @Inject(MESSAGE_DI_TOKEN.MEDIA_VALIDATOR)
    private readonly mediaValidator: MessageMediaValidatorPort,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(CONVERSATION_DI_TOKEN.CHAT_REALTIME)
    private readonly realtime: ChatRealtimePort,
  ) {}

  async execute(command: MessageSendCommand): Promise<MessageEntity> {
    this.validateContent(command);
    if (command.type === MessageType.IMAGE && command.mediaId) {
      const conversation = await this.conversations.findById(
        command.conversationId,
      );
      if (!conversation) throw new MessageConversationNotFoundException();
      const member = await this.members.findByParticipant(
        command.conversationId,
        {
          participantType: ConversationParticipantType.USER,
          userId: command.senderUserId,
        },
      );
      if (!member || member.status !== ConversationMemberStatus.ACTIVE) {
        throw new ConversationForbiddenException();
      }
      const existing = await this.messages.findByIdempotencyKey(
        member.id,
        command.clientMessageId,
      );
      if (existing) return existing;
      await this.mediaValidator.assertAttachable(
        command.mediaId,
        command.conversationId,
      );
    }

    let createdMessage: MessageEntity | null = null;
    const result = await this.unitOfWork.run(async (context) => {
      const conversation = await this.conversations.findByIdForUpdate(
        command.conversationId,
        context,
      );
      if (!conversation) throw new MessageConversationNotFoundException();

      const member = await this.members.findByParticipantForUpdate(
        command.conversationId,
        {
          participantType: ConversationParticipantType.USER,
          userId: command.senderUserId,
        },
        context,
      );
      if (!member || member.status !== ConversationMemberStatus.ACTIVE) {
        throw new ConversationForbiddenException();
      }

      const existing = await this.messages.findByIdempotencyKey(
        member.id,
        command.clientMessageId,
      );
      if (existing) return existing;

      const sequence = await this.messages.nextSequenceForUpdate(
        command.conversationId,
        context,
      );
      const message = MessageEntity.create({
        conversationId: command.conversationId,
        senderMemberId: member.id,
        senderNameSnapshot: member.displayName,
        clientMessageId: command.clientMessageId,
        type: command.type,
        content: command.content,
        mediaId: command.mediaId,
        sequence,
      });
      await this.messages.save(message, context);
      createdMessage = message;
      return message;
    });
    if (createdMessage)
      this.realtime.messageCreated(createdMessage, command.senderUserId);
    return result;
  }

  private validateContent(command: MessageSendCommand): void {
    const content = command.content?.trim() ?? null;
    if (content !== command.content) {
      throw new MessageContentInvalidException();
    }
    if (command.type === MessageType.TEXT) {
      if (!content || content.length > 4000 || command.mediaId !== null) {
        throw new MessageContentInvalidException();
      }
      return;
    }
    if (command.type === MessageType.IMAGE && command.mediaId === null) {
      throw new MessageContentInvalidException();
    }
    if (content !== null && content.length > 4000) {
      throw new MessageContentInvalidException();
    }
  }
}
