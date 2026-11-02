import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class ConversationGetDetailQuery {
  constructor(
    readonly conversationId: Uuid,
    readonly userId: Uuid,
  ) {}
}
