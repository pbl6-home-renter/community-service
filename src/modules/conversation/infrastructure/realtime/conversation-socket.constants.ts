export const CONVERSATION_SOCKET_CLIENT_EVENTS = {
  JOIN: 'conversation:join',
  LEAVE: 'conversation:leave',
} as const;

export const CONVERSATION_SOCKET_SERVER_EVENTS = {
  MESSAGE_CREATED: 'message:created',
  READ_UPDATED: 'conversation:read-updated',
  ACCESS_REVOKED: 'conversation:access-revoked',
  AVAILABLE: 'conversation:available',
} as const;

/** `code` returned in the acknowledgement of a client event. */
export const CONVERSATION_SOCKET_ACK_CODES = {
  JOINED: 'JOINED',
  LEFT: 'LEFT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CONVERSATION_ID: 'INVALID_CONVERSATION_ID',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ConversationSocketAckCode =
  (typeof CONVERSATION_SOCKET_ACK_CODES)[keyof typeof CONVERSATION_SOCKET_ACK_CODES];
