import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CONVERSATION_DI_TOKEN } from '../../../conversation.di-token';
import { ConversationUnreadSummaryQueryPort } from '../../ports/conversation-unread-summary-query.port';
import { ConversationUnreadSummaryQuery } from './conversation-unread-summary.query';

@QueryHandler(ConversationUnreadSummaryQuery)
export class ConversationUnreadSummaryQueryHandler implements IQueryHandler<
  ConversationUnreadSummaryQuery,
  number
> {
  constructor(
    @Inject(CONVERSATION_DI_TOKEN.UNREAD_SUMMARY_QUERY)
    private readonly unreadSummaryQuery: ConversationUnreadSummaryQueryPort,
  ) {}

  execute(query: ConversationUnreadSummaryQuery): Promise<number> {
    return this.unreadSummaryQuery.countTotalUnread(query.userId);
  }
}
