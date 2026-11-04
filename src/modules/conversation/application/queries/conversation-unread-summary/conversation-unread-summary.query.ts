import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class ConversationUnreadSummaryQuery {
  constructor(readonly userId: Uuid) {}
}
