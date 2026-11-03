import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { type Socket } from 'socket.io';
import { ConversationSocketAccessService } from '../../application/queries/conversation-socket-access.service';
import { ChatRealtimePort } from '../../application/ports/chat-realtime.port';
import { isValidUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MessageEntity } from 'modules/message/domain/entities/message.entity';
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

  messageCreated(message: MessageEntity, senderUserId: Uuid | null): void {
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
        createdAt: message.createdAt,
      },
    );
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
