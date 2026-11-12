import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CONVERSATION_MEMBER_DI_TOKEN } from 'modules/conversation-member/conversation-member.di-token';
import { ConversationMemberRepository } from 'modules/conversation-member/domain/repositories/conversation-member.repository';
import { ConversationMemberStatus } from 'modules/conversation-member/domain/enums/conversation-member-status.enum';
import { ConversationParticipantType } from 'modules/conversation-member/domain/enums/conversation-participant-type.enum';
import { CONVERSATION_DI_TOKEN } from 'modules/conversation/conversation.di-token';
import { ConversationForbiddenException } from 'modules/conversation/domain/exceptions/conversation-forbidden.exception';
import { MessageConversationNotFoundException } from '../../../domain/exceptions/message-conversation-not-found.exception';
import { ConversationRepository } from 'modules/conversation/domain/repositories/conversation.repository';
import { CursorPaginatedResult } from 'shared/application/pagination/cursor-paginated-result';
import {
  MessageReadModel,
  MessagePageQueryPort,
} from '../../ports/message-page-query.port';
import { MessageListQuery } from './message-list.query';
import { MESSAGE_DI_TOKEN } from '../../../message.di-token';

@QueryHandler(MessageListQuery)
export class MessageListQueryHandler implements IQueryHandler<
  MessageListQuery,
  CursorPaginatedResult<MessageReadModel>
> {
  constructor(
    @Inject(CONVERSATION_DI_TOKEN.REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(CONVERSATION_MEMBER_DI_TOKEN.REPOSITORY)
    private readonly members: ConversationMemberRepository,
    @Inject(MESSAGE_DI_TOKEN.PAGE_QUERY)
    private readonly pageQuery: MessagePageQueryPort,
  ) {}

  async execute(
    query: MessageListQuery,
  ): Promise<CursorPaginatedResult<MessageReadModel>> {
    const conversation = await this.conversations.findById(
      query.conversationId,
    );
    if (!conversation) throw new MessageConversationNotFoundException();

    const member = await this.members.findByParticipant(query.conversationId, {
      participantType: ConversationParticipantType.USER,
      userId: query.actorUserId,
    });
    if (!member) throw new ConversationForbiddenException();

    const visibleUpTo =
      member.status === ConversationMemberStatus.READ_ONLY
        ? member.leftSequence
        : null;
    return this.pageQuery.findPage({
      conversationId: query.conversationId,
      actorUserId: query.actorUserId,
      cursor: query.cursor,
      pageSize: query.pageSize,
      maxSequence: lowerSequence(query.maxSequence, visibleUpTo),
    });
  }
}

function lowerSequence(a: string | null, b: string | null): string | null {
  if (a === null) return b;
  if (b === null) return a;
  return BigInt(a) <= BigInt(b) ? a : b;
}
