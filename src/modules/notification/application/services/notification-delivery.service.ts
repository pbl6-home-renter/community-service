import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationCategory } from 'modules/notification-preference/domain/enums/notification-category.enum';
import { PUSH_DEVICE_DI_TOKEN } from 'modules/push-device/push-device.di-token';
import { PushDeliveryPort } from 'modules/push-device/application/ports/push-delivery.port';
import { NotificationType } from '../../domain/enums/notification-type.enum';
import { NotificationEntity } from '../../domain/entities/notification.entity';
import { NotificationRealtimePort } from '../ports/notification-realtime.port';
import { NotificationDeliveryPort } from '../ports/notification-delivery.port';
import { NOTIFICATION_DI_TOKEN } from '../../notification.di-token';

@Injectable()
export class NotificationDeliveryService implements NotificationDeliveryPort {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    @Inject(NOTIFICATION_DI_TOKEN.REALTIME)
    private readonly realtime: NotificationRealtimePort,
    @Inject(PUSH_DEVICE_DI_TOKEN.DELIVERY)
    private readonly pushDelivery: PushDeliveryPort,
  ) {}

  async deliver(notifications: NotificationEntity[]): Promise<void> {
    if (notifications.length === 0) return;
    notifications.forEach((notification) => this.emitSocket(notification));

    // Every notification of one event shares the same type, hence one category.
    await this.pushDelivery.send(
      this.categoryOf(notifications[0].type),
      notifications.map((notification) => ({
        userId: notification.recipientUserId,
        message: {
          title: notification.title,
          body: notification.body,
          data: {
            ...this.toStringData(notification.data),
            notificationId: notification.id,
            type: notification.type,
            ...(notification.deepLink
              ? { deepLink: notification.deepLink }
              : {}),
          },
        },
      })),
    );
  }

  private emitSocket(notification: NotificationEntity): void {
    try {
      this.realtime.notificationCreated(notification.recipientUserId, {
        notificationId: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        deepLink: notification.deepLink,
        data: notification.data,
        createdAt: notification.createdAt,
      });
    } catch (error) {
      this.logger.warn(
        `Socket delivery failed for notification ${notification.id}: ${String(error)}`,
      );
    }
  }

  private categoryOf(type: NotificationType): NotificationCategory {
    return type === NotificationType.INVOICE
      ? NotificationCategory.INVOICE
      : NotificationCategory.ISSUE;
  }

  private toStringData(
    data: Record<string, unknown> | null,
  ): Record<string, string> {
    if (!data) return {};
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        typeof value === 'string' ? value : (JSON.stringify(value) ?? 'null'),
      ]),
    );
  }
}
