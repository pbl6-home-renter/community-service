import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CONVERSATION_MEMBER_DI_TOKEN } from 'modules/conversation-member/conversation-member.di-token';
import { ConversationMemberRepository } from 'modules/conversation-member/domain/repositories/conversation-member.repository';
import { ConversationParticipantType } from 'modules/conversation-member/domain/enums/conversation-participant-type.enum';
import { CONVERSATION_DI_TOKEN } from 'modules/conversation/conversation.di-token';
import { ConversationForbiddenException } from 'modules/conversation/domain/exceptions/conversation-forbidden.exception';
import { ConversationRepository } from 'modules/conversation/domain/repositories/conversation.repository';
import { CursorPaginatedResult } from 'shared/application/pagination/cursor-paginated-result';
import { MessageConversationNotFoundException } from '../../../domain/exceptions/message-conversation-not-found.exception';
import { MESSAGE_DI_TOKEN } from '../../../message.di-token';
import {
  MessagePageQueryPort,
  MessageSearchReadModel,
} from '../../ports/message-page-query.port';
import { MessageSearchQuery } from './message-search.query';

/**
 * Searches one conversation. The adapter applies the same visibility rule as
 * the history list (read-only members up to their leftSequence).
 */
@QueryHandler(MessageSearchQuery)
export class MessageSearchQueryHandler implements IQueryHandler<
  MessageSearchQuery,
  CursorPaginatedResult<MessageSearchReadModel>
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
    query: MessageSearchQuery,
  ): Promise<CursorPaginatedResult<MessageSearchReadModel>> {
    const conversation = await this.conversations.findById(
      query.conversationId,
    );
    if (!conversation) throw new MessageConversationNotFoundException();

    const member = await this.members.findByParticipant(query.conversationId, {
      participantType: ConversationParticipantType.USER,
      userId: query.actorUserId,
    });
    if (!member) throw new ConversationForbiddenException();

    return this.pageQuery.search({
      conversationId: query.conversationId,
      actorUserId: query.actorUserId,
      keyword: query.keyword,
      cursor: query.cursor,
      pageSize: query.pageSize,
    });
  }
}
