import { MessageType } from '../enums/message-type.enum';

export type ContentMessageType =
  MessageType.TEXT | MessageType.IMAGE | MessageType.BOT;

/**
 * Message types that carry user-visible content: they can be replied to and
 * searched. System messages are excluded.
 */
export const CONTENT_MESSAGE_TYPES: readonly ContentMessageType[] = [
  MessageType.TEXT,
  MessageType.IMAGE,
  MessageType.BOT,
];

export function isContentMessageType(
  type: MessageType,
): type is ContentMessageType {
  return (CONTENT_MESSAGE_TYPES as readonly MessageType[]).includes(type);
}
