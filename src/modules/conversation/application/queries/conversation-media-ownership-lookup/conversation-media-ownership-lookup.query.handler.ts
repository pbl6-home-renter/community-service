import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CONVERSATION_DI_TOKEN } from '../../../conversation.di-token';
import {
  ConversationMediaOwnershipQueryPort,
  ConversationMediaOwnershipResult,
} from '../../ports/conversation-media-ownership-query.port';
import { ConversationMediaOwnershipLookupQuery } from './conversation-media-ownership-lookup.query';

@QueryHandler(ConversationMediaOwnershipLookupQuery)
export class ConversationMediaOwnershipLookupQueryHandler implements IQueryHandler<
  ConversationMediaOwnershipLookupQuery,
  ConversationMediaOwnershipResult | null
> {
  constructor(
    @Inject(CONVERSATION_DI_TOKEN.MEDIA_OWNERSHIP_QUERY)
    private readonly ownershipQuery: ConversationMediaOwnershipQueryPort,
  ) {}

  execute(
    query: ConversationMediaOwnershipLookupQuery,
  ): Promise<ConversationMediaOwnershipResult | null> {
    return this.ownershipQuery.findForUser(
      query.conversationId,
      query.actorUserId,
      query.mediaId,
    );
  }
}
