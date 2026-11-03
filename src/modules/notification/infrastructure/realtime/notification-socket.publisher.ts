import { Injectable } from '@nestjs/common';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  SocketServer,
  userRoom,
} from 'modules/realtime/infrastructure/socket-server';
import { NOTIFICATION_SOCKET_EVENTS } from './notification-socket.constants';
import {
  NotificationRealtimePort,
  RealtimeNotification,
} from '../../application/ports/notification-realtime.port';

@Injectable()
export class NotificationSocketPublisher implements NotificationRealtimePort {
  constructor(private readonly socket: SocketServer) {}

  notificationCreated(userId: Uuid, notification: RealtimeNotification): void {
    this.socket.emit(
      userRoom(userId),
      NOTIFICATION_SOCKET_EVENTS.CREATED,
      notification,
    );
  }

  notificationReadStateUpdated(
    userId: Uuid,
    notificationId: Uuid | null,
    readAt: Date,
  ): void {
    this.socket.emit(
      userRoom(userId),
      NOTIFICATION_SOCKET_EVENTS.READ_STATE_UPDATED,
      { notificationId, readAt, all: notificationId === null },
    );
  }
}
