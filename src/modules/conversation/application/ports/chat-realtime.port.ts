import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MessageEntity } from 'modules/message/domain/entities/message.entity';

/** Best-effort transport notification. REST remains the source of truth. */
export interface ChatRealtimePort {
  messageCreated(message: MessageEntity, senderUserId: Uuid | null): void;
  readUpdated(
    userId: Uuid,
    conversationId: Uuid,
    unreadCount: number,
    lastReadSequence: string,
  ): void;
  membershipRevoked(userId: Uuid, conversationId: Uuid): void;
  membershipActivated(userId: Uuid, conversationId: Uuid): void;
}
