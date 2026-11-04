import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { CONVERSATION_DI_TOKEN } from '../../../conversation.di-token';
import {
  ConversationListReadModel,
  ConversationPageQueryPort,
} from '../../ports/conversation-page-query.port';
import { ConversationListQuery } from './conversation-list.query';

@QueryHandler(ConversationListQuery)
export class ConversationListQueryHandler implements IQueryHandler<
  ConversationListQuery,
  PaginatedResult<ConversationListReadModel>
> {
  constructor(
    @Inject(CONVERSATION_DI_TOKEN.PAGE_QUERY)
    private readonly pageQuery: ConversationPageQueryPort,
  ) {}

  execute(
    query: ConversationListQuery,
  ): Promise<PaginatedResult<ConversationListReadModel>> {
    if (query.otherUserId?.toLowerCase() === query.userId.toLowerCase()) {
      throw new ValidationException(
        'otherUserId must be a user other than the caller',
      );
    }
    return this.pageQuery.findPage(query);
  }
}
