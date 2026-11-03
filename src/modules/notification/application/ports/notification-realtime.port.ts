import { NotificationType } from '../../domain/enums/notification-type.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface RealtimeNotification {
  notificationId: Uuid;
  type: NotificationType;
  title: string;
  body: string;
  deepLink: string | null;
  data: Record<string, unknown> | null;
  createdAt: Date;
}

export interface NotificationRealtimePort {
  notificationCreated(userId: Uuid, notification: RealtimeNotification): void;
  notificationReadStateUpdated(
    userId: Uuid,
    notificationId: Uuid | null,
    readAt: Date,
  ): void;
}
