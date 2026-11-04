import { MessageType } from '../enums/message-type.enum';

/**
 * Message types that count toward unread totals. System messages stay in
 * history but never raise unread or the chat badge.
 */
export const UNREAD_COUNTED_MESSAGE_TYPES: readonly MessageType[] = [
  MessageType.TEXT,
  MessageType.IMAGE,
  MessageType.BOT,
];
