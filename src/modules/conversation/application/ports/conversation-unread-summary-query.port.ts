import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface ConversationUnreadSummaryQueryPort {
  /** Sum of unread messages over every conversation the user may read. */
  countTotalUnread(userId: Uuid): Promise<number>;
}
