import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { decodeJwt } from 'jose';
import { Server, type Socket } from 'socket.io';
import { ConversationSocketAccessService } from '../../application/queries/conversation-socket-access.service';
import { ChatRealtimePort } from '../../application/ports/chat-realtime.port';
import { AccessTokenVerifier } from 'shared/infrastructure/security/access-token-verifier.service';
import { isValidUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';
import { UserStatus } from 'shared/domain/enums/user-status.enum';
import { MessageEntity } from 'modules/message/domain/entities/message.entity';

const SOCKET_PATH = '/api/v1/community/socket.io';
const conversationRoom = (id: Uuid): string => `conversation:${id}`;
const userRoom = (id: Uuid): string => `user:${id}`;

interface JoinRequest {
  conversationId?: unknown;
}
interface JoinResult {
  ok: boolean;
  code: string;
  conversationId?: Uuid;
}

@Injectable()
export class ChatGateway
  implements OnModuleInit, OnModuleDestroy, ChatRealtimePort
{
  private server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly tokens: AccessTokenVerifier,
    private readonly access: ConversationSocketAccessService,
  ) {}

  onModuleInit(): void {
    this.server = new Server(this.httpAdapterHost.httpAdapter.getHttpServer(), {
      path: SOCKET_PATH,
      transports: ['websocket'],
    });
    this.server.on('connection', (client) => {
      void this.handleConnection(client);
      this.bindEvents(client);
    });
  }

  onModuleDestroy(): void {
    this.server?.close();
  }

  private bindEvents(client: Socket): void {
    client.on(
      'conversation:join',
      (request: JoinRequest, acknowledge?: (result: JoinResult) => void) => {
        void this.join(client, request)
          .then((result) => acknowledge?.(result))
          .catch((error: unknown) => {
            this.logger.error(`Socket join failed: ${String(error)}`);
            acknowledge?.({ ok: false, code: 'INTERNAL_ERROR' });
          });
      },
    );
    client.on(
      'conversation:leave',
      (request: JoinRequest, acknowledge?: (result: JoinResult) => void) => {
        void this.leave(client, request)
          .then((result) => acknowledge?.(result))
          .catch((error: unknown) => {
            this.logger.error(`Socket leave failed: ${String(error)}`);
            acknowledge?.({ ok: false, code: 'INTERNAL_ERROR' });
          });
      },
    );
  }

  async handleConnection(client: Socket): Promise<void> {
    const origin = client.handshake.headers.origin;
    const allowed = process.env.CORS_ORIGINS?.split(',').map((value) =>
      value.trim(),
    );
    if (origin && allowed && !allowed.includes(origin)) {
      client.disconnect(true);
      return;
    }

    const token: unknown = client.handshake.auth?.token;
    if (typeof token !== 'string' || !token) {
      client.disconnect(true);
      return;
    }
    try {
      const user = await this.tokens.verify(token);
      if (user.status !== UserStatus.ACTIVE) {
        client.disconnect(true);
        return;
      }
      const expiresAt = decodeJwt(token).exp;
      if (!expiresAt || expiresAt * 1000 <= Date.now()) {
        client.disconnect(true);
        return;
      }
      client.data.userId = user.id;
      await client.join(userRoom(user.id));
      const timeout = setTimeout(
        () => client.disconnect(true),
        Math.min(expiresAt * 1000 - Date.now(), 2147483647),
      );
      client.once('disconnect', () => clearTimeout(timeout));
      client.emit('session:ready', { userId: user.id });
    } catch (error) {
      this.logger.warn(`Socket authentication failed: ${String(error)}`);
      client.disconnect(true);
    }
  }

  async join(client: Socket, request: JoinRequest): Promise<JoinResult> {
    const userId: Uuid | undefined = client.data.userId;
    if (!userId) return { ok: false, code: 'UNAUTHORIZED' };
    if (
      !request ||
      typeof request.conversationId !== 'string' ||
      !isValidUuid(request.conversationId)
    ) {
      return { ok: false, code: 'INVALID_CONVERSATION_ID' };
    }
    const conversationId = request.conversationId as Uuid;
    if (!(await this.access.canJoin(conversationId, userId))) {
      return { ok: false, code: 'FORBIDDEN' };
    }
    await client.join(conversationRoom(conversationId));
    // A kick can commit between the first check and joining the Socket.IO room.
    if (!(await this.access.canJoin(conversationId, userId))) {
      await client.leave(conversationRoom(conversationId));
      return { ok: false, code: 'FORBIDDEN' };
    }
    return { ok: true, code: 'JOINED', conversationId };
  }

  async leave(client: Socket, request: JoinRequest): Promise<JoinResult> {
    if (!client.data.userId) return { ok: false, code: 'UNAUTHORIZED' };
    if (
      !request ||
      typeof request.conversationId !== 'string' ||
      !isValidUuid(request.conversationId)
    ) {
      return { ok: false, code: 'INVALID_CONVERSATION_ID' };
    }
    const conversationId = request.conversationId as Uuid;
    await client.leave(conversationRoom(conversationId));
    return { ok: true, code: 'LEFT', conversationId };
  }

  messageCreated(message: MessageEntity, senderUserId: Uuid | null): void {
    this.server
      ?.to(conversationRoom(message.conversationId))
      .emit('message:created', {
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
      });
  }

  readUpdated(
    userId: Uuid,
    conversationId: Uuid,
    unreadCount: number,
    lastReadSequence: string,
  ): void {
    this.server?.to(userRoom(userId)).emit('conversation:read-updated', {
      conversationId,
      unreadCount,
      lastReadSequence,
    });
  }

  membershipRevoked(userId: Uuid, conversationId: Uuid): void {
    this.server
      ?.in(userRoom(userId))
      .socketsLeave(conversationRoom(conversationId));
    this.server
      ?.to(userRoom(userId))
      .emit('conversation:access-revoked', { conversationId });
  }

  membershipActivated(userId: Uuid, conversationId: Uuid): void {
    this.server
      ?.to(userRoom(userId))
      .emit('conversation:available', { conversationId });
  }
}
