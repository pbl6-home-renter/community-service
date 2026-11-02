import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ConversationForbiddenException } from 'modules/conversation/domain/exceptions/conversation-forbidden.exception';
import { ConversationNotFoundException } from 'modules/conversation/domain/exceptions/conversation-not-found.exception';
import { CONVERSATION_DI_TOKEN } from '../../../conversation.di-token';
import {
  ConversationDetailQueryPort,
  ConversationDetailQueryResult,
} from '../../ports/conversation-detail-query.port';
import { ConversationGetDetailQuery } from './conversation-get-detail.query';

@QueryHandler(ConversationGetDetailQuery)
export class ConversationGetDetailQueryHandler implements IQueryHandler<
  ConversationGetDetailQuery,
  ConversationDetailQueryResult
> {
  constructor(
    @Inject(CONVERSATION_DI_TOKEN.DETAIL_QUERY)
    private readonly detailQuery: ConversationDetailQueryPort,
  ) {}

  async execute(
    query: ConversationGetDetailQuery,
  ): Promise<ConversationDetailQueryResult> {
    const result = await this.detailQuery.findDetailForUser(
      query.conversationId,
      query.userId,
    );
    if (!result) throw new ConversationNotFoundException();
    if (!result.currentMember) throw new ConversationForbiddenException();
    return result;
  }
}
