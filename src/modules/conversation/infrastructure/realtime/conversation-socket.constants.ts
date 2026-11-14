export const CONVERSATION_SOCKET_CLIENT_EVENTS = {
  JOIN: 'conversation:join',
  LEAVE: 'conversation:leave',
  TYPING: 'conversation:typing',
} as const;

export const CONVERSATION_SOCKET_SERVER_EVENTS = {
  MESSAGE_CREATED: 'message:created',
  MESSAGE_RECEIVED: 'chat:message-received',
  READ_UPDATED: 'conversation:read-updated',
  MEMBER_READ: 'conversation:member-read',
  TYPING: 'conversation:typing',
  ACCESS_REVOKED: 'conversation:access-revoked',
  AVAILABLE: 'conversation:available',
} as const;

/** `code` returned in the acknowledgement of a client event. */
export const CONVERSATION_SOCKET_ACK_CODES = {
  JOINED: 'JOINED',
  LEFT: 'LEFT',
  SENT: 'SENT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CONVERSATION_ID: 'INVALID_CONVERSATION_ID',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ConversationSocketAckCode =
  (typeof CONVERSATION_SOCKET_ACK_CODES)[keyof typeof CONVERSATION_SOCKET_ACK_CODES];
