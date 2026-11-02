import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface MessageMarkReadResult {
  conversationId: Uuid;
  unreadCount: number;
}
