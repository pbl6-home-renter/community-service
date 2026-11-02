import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class ConversationMediaOwnershipLookupQuery {
  constructor(
    readonly conversationId: Uuid,
    readonly actorUserId: Uuid,
    readonly mediaId?: Uuid,
  ) {}
}
