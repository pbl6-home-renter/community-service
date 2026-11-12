import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CONVERSATION_MEMBER_DI_TOKEN } from 'modules/conversation-member/conversation-member.di-token';
import { ConversationMemberRepository } from 'modules/conversation-member/domain/repositories/conversation-member.repository';
import { ConversationMemberStatus } from 'modules/conversation-member/domain/enums/conversation-member-status.enum';
import { ConversationParticipantType } from 'modules/conversation-member/domain/enums/conversation-participant-type.enum';
import { ConversationMemberReadCursorInvalidException } from 'modules/conversation-member/domain/exceptions/conversation-member-read-cursor-invalid.exception';
import { CONVERSATION_DI_TOKEN } from 'modules/conversation/conversation.di-token';
import { ConversationForbiddenException } from 'modules/conversation/domain/exceptions/conversation-forbidden.exception';
import { ConversationRepository } from 'modules/conversation/domain/repositories/conversation.repository';
import { MESSAGE_DI_TOKEN } from 'modules/message/message.di-token';
import { MessageRepository } from 'modules/message/domain/repositories/message.repository';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { MessageConversationNotFoundException } from '../../../domain/exceptions/message-conversation-not-found.exception';
import { MessageMarkReadCommand } from './message-mark-read.command';
import { MessageMarkReadResult } from './message-mark-read.result';
import { ChatRealtimePort } from 'modules/conversation/application/ports/chat-realtime.port';

@CommandHandler(MessageMarkReadCommand)
export class MessageMarkReadCommandHandler implements ICommandHandler<
  MessageMarkReadCommand,
  MessageMarkReadResult
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

  async execute(
    command: MessageMarkReadCommand,
  ): Promise<MessageMarkReadResult> {
    let changed = false;
    let isActiveMember = false;
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
          userId: command.actorUserId,
        },
        context,
      );
      if (!member) throw new ConversationForbiddenException();

      const latestSequence = await this.messages.latestSequenceForUpdate(
        command.conversationId,
        context,
      );
      const cursor = BigInt(command.lastReadSequence);
      const currentCursor = BigInt(member.lastReadSequence);
      const latest = BigInt(latestSequence);
      if (cursor < currentCursor || cursor > latest) {
        throw new ConversationMemberReadCursorInvalidException();
      }

      if (member.status === ConversationMemberStatus.READ_ONLY) {
        const leftSequence = BigInt(member.leftSequence!);
        if (cursor > leftSequence) {
          throw new ConversationMemberReadCursorInvalidException();
        }
      }

      if (
        cursor > currentCursor &&
        !(await this.messages.hasSequenceForConversation(
          command.conversationId,
          command.lastReadSequence,
          context,
        ))
      ) {
        throw new ConversationMemberReadCursorInvalidException();
      }

      changed = member.markRead(command.lastReadSequence);
      isActiveMember = member.status === ConversationMemberStatus.ACTIVE;
      if (changed) await this.members.save(member, context);

      return {
        conversationId: conversation.id,
        unreadCount: await this.messages.countUnread(
          conversation.id,
          member.id,
          member.lastReadSequence,
          member.status === ConversationMemberStatus.READ_ONLY
            ? member.leftSequence
            : null,
        ),
      };
    });
    if (changed) {
      this.realtime.readUpdated(
        command.actorUserId,
        result.conversationId,
        result.unreadCount,
        command.lastReadSequence,
      );
      // Read receipts count active members only.
      if (isActiveMember) {
        this.realtime.memberReadUpdated(
          result.conversationId,
          command.actorUserId,
          command.lastReadSequence,
        );
      }
    }
    return result;
  }
}
