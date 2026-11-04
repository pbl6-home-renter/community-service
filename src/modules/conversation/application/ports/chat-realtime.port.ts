import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MessageEntity } from 'modules/message/domain/entities/message.entity';
import { MessageType } from 'modules/message/domain/enums/message-type.enum';

export interface ChatMessageReceivedEvent {
  messageId: Uuid;
  conversationId: Uuid;
  sequence: string;
  senderUserId: Uuid | null;
  senderName: string;
  conversationName: string | null;
  type: MessageType.TEXT | MessageType.IMAGE | MessageType.BOT;
  contentPreview: string;
  createdAt: Date;
}

/** Best-effort transport notification. REST remains the source of truth. */
export interface ChatRealtimePort {
  messageCreated(message: MessageEntity, senderUserId: Uuid | null): void;
  messageReceived(userId: Uuid, event: ChatMessageReceivedEvent): void;
  readUpdated(
    userId: Uuid,
    conversationId: Uuid,
    unreadCount: number,
    lastReadSequence: string,
  ): void;
  membershipRevoked(userId: Uuid, conversationId: Uuid): void;
  membershipActivated(userId: Uuid, conversationId: Uuid): void;
}
