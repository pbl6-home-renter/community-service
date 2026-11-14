import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CONVERSATION_MEMBER_DI_TOKEN } from 'modules/conversation-member/conversation-member.di-token';
import { ConversationMemberEntity } from 'modules/conversation-member/domain/entities/conversation-member.entity';
import { ConversationMemberRole } from 'modules/conversation-member/domain/enums/conversation-member-role.enum';
import { ConversationMemberStatus } from 'modules/conversation-member/domain/enums/conversation-member-status.enum';
import { ConversationParticipantType } from 'modules/conversation-member/domain/enums/conversation-participant-type.enum';
import { ConversationMemberRepository } from 'modules/conversation-member/domain/repositories/conversation-member.repository';
import { MessageSendResult } from 'modules/message/application/commands/message-send/message-send.result';
import { ChatMessagePushNotifier } from 'modules/message/application/services/chat-message-push-notifier';
import { MessageEntity } from 'modules/message/domain/entities/message.entity';
import { MessageType } from 'modules/message/domain/enums/message-type.enum';
import { BOT_REMINDER_FALLBACK_TEXT } from 'modules/message/domain/constants/bot-reminder-message-code.constant';
import { MessageRepository } from 'modules/message/domain/repositories/message.repository';
import { MESSAGE_DI_TOKEN } from 'modules/message/message.di-token';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { CONVERSATION_DI_TOKEN } from '../../../conversation.di-token';
import { ConversationEntity } from '../../../domain/entities/conversation.entity';
import { ConversationContextType } from '../../../domain/enums/conversation-context-type.enum';
import { ConversationForbiddenException } from '../../../domain/exceptions/conversation-forbidden.exception';
import { ConversationNotFoundException } from '../../../domain/exceptions/conversation-not-found.exception';
import { ConversationRepository } from '../../../domain/repositories/conversation.repository';
import { BotReminderResourcePort } from '../../ports/bot-reminder-resource.port';
import { ChatRealtimePort } from '../../ports/chat-realtime.port';
import { BotReminderSendCommand } from './bot-reminder-send.command';

const BOT_IDENTITY = {
  participantType: ConversationParticipantType.SYSTEM,
  systemParticipantKey: 'bot_reminder',
} as const;

@CommandHandler(BotReminderSendCommand)
export class BotReminderSendCommandHandler implements ICommandHandler<
  BotReminderSendCommand,
  MessageSendResult
> {
  constructor(
    @Inject(CONVERSATION_DI_TOKEN.REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(CONVERSATION_MEMBER_DI_TOKEN.REPOSITORY)
    private readonly members: ConversationMemberRepository,
    @Inject(MESSAGE_DI_TOKEN.REPOSITORY)
    private readonly messages: MessageRepository,
    @Inject(CONVERSATION_DI_TOKEN.BOT_REMINDER_RESOURCE)
    private readonly resources: BotReminderResourcePort,
    @Inject(UNIT_OF_WORK_DI_TOKEN) private readonly unitOfWork: IUnitOfWork,
    @Inject(CONVERSATION_DI_TOKEN.CHAT_REALTIME)
    private readonly realtime: ChatRealtimePort,
    private readonly push: ChatMessagePushNotifier,
  ) {}

  async execute(command: BotReminderSendCommand): Promise<MessageSendResult> {
    const conversation = await this.conversations.findById(
      command.conversationId,
    );
    if (!conversation) throw new ConversationNotFoundException();
    const member = await this.members.findByParticipant(
      command.conversationId,
      {
        participantType: ConversationParticipantType.USER,
        userId: command.userId,
      },
    );
    this.assertContext(conversation, member);
    const bot = await this.members.findByParticipant(
      command.conversationId,
      BOT_IDENTITY,
    );
    if (bot) {
      const existing = await this.messages.findByIdempotencyKey(
        bot.id,
        command.clientMessageId,
      );
      if (existing) return this.retryResult(existing, command);
    }
    const contractId = conversation.contextId!;
    const content = await this.resources.render(
      command.templateType,
      command.resourceId,
      contractId,
      command.token,
    );
    const result = await this.unitOfWork.run(async (context) => {
      const current = await this.conversations.findByIdForUpdate(
        command.conversationId,
        context,
      );
      if (!current) throw new ConversationNotFoundException();
      const actor = await this.members.findByParticipantForUpdate(
        command.conversationId,
        {
          participantType: ConversationParticipantType.USER,
          userId: command.userId,
        },
        context,
      );
      this.assertContext(current, actor);
      if (current.contextId?.toLowerCase() !== contractId.toLowerCase())
        throw new ConversationForbiddenException();
      let sender = await this.members.findByParticipantForUpdate(
        current.id,
        BOT_IDENTITY,
        context,
      );
      if (sender) {
        const existing = await this.messages.findByIdempotencyKey(
          sender.id,
          command.clientMessageId,
        );
        if (existing)
          return {
            ...this.retryResult(existing, command),
            created: false as const,
          };
      } else {
        sender = ConversationMemberEntity.create({
          conversationId: current.id,
          ...BOT_IDENTITY,
          displayName: 'Rentify',
          role: ConversationMemberRole.SYSTEM,
          joinedAt: current.createdAt,
        });
        await this.members.save(sender, context);
      }
      const sequence = await this.messages.nextSequenceForUpdate(
        current.id,
        context,
      );
      const message = MessageEntity.create({
        conversationId: current.id,
        senderMemberId: sender.id,
        senderNameSnapshot: sender.displayName,
        clientMessageId: command.clientMessageId,
        type: MessageType.BOT,
        content: BOT_REMINDER_FALLBACK_TEXT,
        sequence,
        payload: {
          action: 'bot_reminder',
          actorUserId: command.userId,
          templateType: command.templateType,
          resourceId: command.resourceId,
          ...content,
        },
      });
      await this.messages.save(message, context);
      const recipients = await this.members.findActiveUserMembersForUpdate(
        current.id,
        context,
      );
      return {
        message,
        replyTo: null,
        created: true as const,
        recipients,
        conversation: current,
      };
    });
    if (result.created) {
      this.realtime.messageCreated(result.message, null);
      for (const member of result.recipients) {
        if (!member.userId) continue;
        this.realtime.messageReceived(member.userId, {
          messageId: result.message.id,
          conversationId: result.message.conversationId,
          sequence: result.message.sequence,
          senderUserId: null,
          senderName: result.message.senderNameSnapshot,
          senderAvatarUrl: null,
          conversationName: result.conversation.title?.value ?? null,
          type: MessageType.BOT,
          contentPreview: result.message.contentPreview,
          createdAt: result.message.createdAt,
        });
      }
      void this.push.notify(result.message, command.userId);
    }
    return { message: result.message, replyTo: null };
  }

  private assertContext(
    conversation: ConversationEntity,
    member: ConversationMemberEntity | null,
  ): void {
    if (
      !member ||
      member.status !== ConversationMemberStatus.ACTIVE ||
      conversation.contextType !== ConversationContextType.CONTRACT ||
      !conversation.contextId
    )
      throw new ConversationForbiddenException();
  }

  private retryResult(
    message: MessageEntity,
    command: BotReminderSendCommand,
  ): MessageSendResult {
    const payload = message.payload;
    if (
      payload?.action !== 'bot_reminder' ||
      payload.actorUserId.toLowerCase() !== command.userId.toLowerCase() ||
      payload.templateType !== command.templateType ||
      payload.resourceId.toLowerCase() !== command.resourceId.toLowerCase()
    )
      throw new ValidationException(
        'Idempotency key belongs to another reminder',
      );
    return { message, replyTo: null };
  }
}
