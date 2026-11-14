import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { type Socket } from 'socket.io';
import { ConversationSocketAccessService } from '../../application/queries/conversation-socket-access.service';
import {
  ChatMessageReceivedEvent,
  ChatRealtimePort,
} from '../../application/ports/chat-realtime.port';
import { isValidUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MessageEntity } from 'modules/message/domain/entities/message.entity';
import { MessageReplyReference } from 'modules/message/domain/value-objects/message-reply-reference.vo';
import {
  SocketServer,
  userRoom,
} from 'modules/realtime/infrastructure/socket-server';
import {
  CONVERSATION_SOCKET_ACK_CODES as ACK,
  CONVERSATION_SOCKET_CLIENT_EVENTS as CLIENT_EVENTS,
  CONVERSATION_SOCKET_SERVER_EVENTS as SERVER_EVENTS,
  ConversationSocketAckCode,
} from './conversation-socket.constants';

const conversationRoom = (id: Uuid): string => `conversation:${id}`;

interface JoinRequest {
  conversationId?: unknown;
}
interface JoinResult {
  ok: boolean;
  code: ConversationSocketAckCode;
  conversationId?: Uuid;
}
interface TypingRequest extends JoinRequest {
  isTyping?: unknown;
}

@Injectable()
export class ChatGateway implements OnModuleInit, ChatRealtimePort {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly socket: SocketServer,
    private readonly access: ConversationSocketAccessService,
  ) {}

  onModuleInit(): void {
    this.socket.onConnection((client) => this.bindEvents(client));
  }

  private bindEvents(client: Socket): void {
    client.on(
      CLIENT_EVENTS.JOIN,
      (request: JoinRequest, acknowledge?: (result: JoinResult) => void) => {
        void this.join(client, request)
          .then((result) => acknowledge?.(result))
          .catch((error: unknown) => {
            this.logger.error(`Socket join failed: ${String(error)}`);
            acknowledge?.({ ok: false, code: ACK.INTERNAL_ERROR });
          });
      },
    );
    client.on(
      CLIENT_EVENTS.LEAVE,
      (request: JoinRequest, acknowledge?: (result: JoinResult) => void) => {
        void this.leave(client, request)
          .then((result) => acknowledge?.(result))
          .catch((error: unknown) => {
            this.logger.error(`Socket leave failed: ${String(error)}`);
            acknowledge?.({ ok: false, code: ACK.INTERNAL_ERROR });
          });
      },
    );
    client.on(
      CLIENT_EVENTS.TYPING,
      (request: TypingRequest, acknowledge?: (result: JoinResult) => void) => {
        void this.typing(client, request)
          .then((result) =>
            typeof acknowledge === 'function' ? acknowledge(result) : undefined,
          )
          .catch((error: unknown) => {
            this.logger.error(`Socket typing failed: ${String(error)}`);
            if (typeof acknowledge === 'function') {
              acknowledge({ ok: false, code: ACK.INTERNAL_ERROR });
            }
          });
      },
    );
  }

  async join(client: Socket, request: JoinRequest): Promise<JoinResult> {
    const userId: Uuid | undefined = client.data.userId;
    if (!userId) return { ok: false, code: ACK.UNAUTHORIZED };
    if (
      !request ||
      typeof request.conversationId !== 'string' ||
      !isValidUuid(request.conversationId)
    ) {
      return { ok: false, code: ACK.INVALID_CONVERSATION_ID };
    }
    const conversationId = request.conversationId as Uuid;
    if (!(await this.access.canJoin(conversationId, userId))) {
      return { ok: false, code: ACK.FORBIDDEN };
    }
    await client.join(conversationRoom(conversationId));
    // A kick can commit between the first check and joining the Socket.IO room.
    if (!(await this.access.canJoin(conversationId, userId))) {
      await client.leave(conversationRoom(conversationId));
      return { ok: false, code: ACK.FORBIDDEN };
    }
    return { ok: true, code: ACK.JOINED, conversationId };
  }

  async leave(client: Socket, request: JoinRequest): Promise<JoinResult> {
    if (!client.data.userId) return { ok: false, code: ACK.UNAUTHORIZED };
    if (
      !request ||
      typeof request.conversationId !== 'string' ||
      !isValidUuid(request.conversationId)
    ) {
      return { ok: false, code: ACK.INVALID_CONVERSATION_ID };
    }
    const conversationId = request.conversationId as Uuid;
    await client.leave(conversationRoom(conversationId));
    return { ok: true, code: ACK.LEFT, conversationId };
  }

  /**
   * Relays a typing signal to the other sockets of the room. Nothing is
   * stored; the sender must have joined the room and still be active.
   */
  async typing(client: Socket, request: TypingRequest): Promise<JoinResult> {
    const userId: Uuid | undefined = client.data.userId;
    if (!userId) return { ok: false, code: ACK.UNAUTHORIZED };
    if (
      !request ||
      typeof request.conversationId !== 'string' ||
      !isValidUuid(request.conversationId)
    ) {
      return { ok: false, code: ACK.INVALID_CONVERSATION_ID };
    }
    if (typeof request.isTyping !== 'boolean') {
      return { ok: false, code: ACK.INVALID_PAYLOAD };
    }
    const conversationId = request.conversationId as Uuid;
    const room = conversationRoom(conversationId);
    if (!client.rooms.has(room)) return { ok: false, code: ACK.FORBIDDEN };
    if (!(await this.access.canJoin(conversationId, userId))) {
      await client.leave(room);
      return { ok: false, code: ACK.FORBIDDEN };
    }
    client.to(room).emit(SERVER_EVENTS.TYPING, {
      conversationId,
      userId,
      isTyping: request.isTyping,
    });
    return { ok: true, code: ACK.SENT, conversationId };
  }

  messageCreated(
    message: MessageEntity,
    senderUserId: Uuid | null,
    replyTo: MessageReplyReference | null = null,
  ): void {
    this.socket.emit(
      conversationRoom(message.conversationId),
      SERVER_EVENTS.MESSAGE_CREATED,
      {
        id: message.id,
        conversationId: message.conversationId,
        senderUserId,
        senderName: message.senderNameSnapshot,
        senderType: senderUserId ? 'user' : 'system',
        sequence: message.sequence,
        clientMessageId: message.clientMessageId,
        type: message.type,
        content: message.content,
        mediaId: message.mediaId,
        payload: message.payload,
        replyTo: replyTo
          ? {
              id: replyTo.id,
              senderName: replyTo.senderName,
              type: replyTo.type,
              contentPreview: replyTo.contentPreview,
              isUnavailable: replyTo.isUnavailable,
            }
          : null,
        createdAt: message.createdAt,
      },
    );
  }

  messageReceived(userId: Uuid, event: ChatMessageReceivedEvent): void {
    this.socket.emit(userRoom(userId), SERVER_EVENTS.MESSAGE_RECEIVED, {
      messageId: event.messageId,
      conversationId: event.conversationId,
      sequence: event.sequence,
      senderUserId: event.senderUserId,
      senderName: event.senderName,
      senderAvatarUrl: event.senderAvatarUrl,
      conversationName: event.conversationName,
      type: event.type,
      contentPreview: event.contentPreview,
      createdAt: event.createdAt,
    });
  }

  readUpdated(
    userId: Uuid,
    conversationId: Uuid,
    unreadCount: number,
    lastReadSequence: string,
  ): void {
    this.socket.emit(userRoom(userId), SERVER_EVENTS.READ_UPDATED, {
      conversationId,
      unreadCount,
      lastReadSequence,
    });
  }

  memberReadUpdated(
    conversationId: Uuid,
    userId: Uuid,
    lastReadSequence: string,
  ): void {
    this.socket.emit(
      conversationRoom(conversationId),
      SERVER_EVENTS.MEMBER_READ,
      {
        conversationId,
        userId,
        lastReadSequence,
      },
    );
  }

  membershipRevoked(userId: Uuid, conversationId: Uuid): void {
    this.socket.leaveRoom(userRoom(userId), conversationRoom(conversationId));
    this.socket.emit(userRoom(userId), SERVER_EVENTS.ACCESS_REVOKED, {
      conversationId,
    });
  }

  membershipActivated(userId: Uuid, conversationId: Uuid): void {
    this.socket.emit(userRoom(userId), SERVER_EVENTS.AVAILABLE, {
      conversationId,
    });
  }
}
