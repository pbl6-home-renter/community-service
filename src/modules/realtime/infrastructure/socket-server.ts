import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { decodeJwt } from 'jose';
import { Server, type Socket } from 'socket.io';
import { AccessTokenVerifier } from 'shared/infrastructure/security/access-token-verifier.service';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { UserStatus } from 'shared/domain/enums/user-status.enum';
import { SOCKET_PATH, SOCKET_SESSION_EVENTS } from './socket.constants';

export const userRoom = (id: Uuid): string => `user:${id}`;

type ConnectionHandler = (client: Socket) => void;

/**
 * Owns the single Socket.IO server: authenticates each connection and joins
 * it to its user room. Feature modules register their own client events via
 * onConnection() and emit through to().
 */
@Injectable()
export class SocketServer implements OnModuleInit, OnModuleDestroy {
  private server: Server | null = null;
  private readonly logger = new Logger(SocketServer.name);
  private readonly connectionHandlers: ConnectionHandler[] = [];

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly tokens: AccessTokenVerifier,
  ) {}

  onModuleInit(): void {
    this.server = new Server(this.httpAdapterHost.httpAdapter.getHttpServer(), {
      path: SOCKET_PATH,
      transports: ['websocket'],
    });
    this.server.on('connection', (client) => {
      void this.authenticate(client);
      this.connectionHandlers.forEach((handler) => handler(client));
    });
  }

  onModuleDestroy(): void {
    this.server?.close();
  }

  onConnection(handler: ConnectionHandler): void {
    this.connectionHandlers.push(handler);
  }

  emit(room: string, event: string, payload: unknown): void {
    this.server?.to(room).emit(event, payload);
  }

  /** Removes every socket in `fromRoom` from `room`. */
  leaveRoom(fromRoom: string, room: string): void {
    this.server?.in(fromRoom).socketsLeave(room);
  }

  private async authenticate(client: Socket): Promise<void> {
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
      client.emit(SOCKET_SESSION_EVENTS.READY, { userId: user.id });
    } catch (error) {
      this.logger.warn(`Socket authentication failed: ${String(error)}`);
      client.disconnect(true);
    }
  }
}
