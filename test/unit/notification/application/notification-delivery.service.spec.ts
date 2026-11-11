import { NotificationDeliveryService } from 'modules/notification/application/services/notification-delivery.service';
import { NotificationRealtimePort } from 'modules/notification/application/ports/notification-realtime.port';
import { NotificationEntity } from 'modules/notification/domain/entities/notification.entity';
import { NotificationType } from 'modules/notification/domain/enums/notification-type.enum';
import { NotificationCategory } from 'modules/notification-preference/domain/enums/notification-category.enum';
import { PushDeliveryPort } from 'modules/push-device/application/ports/push-delivery.port';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

function createNotification(type = NotificationType.INVOICE) {
  return NotificationEntity.create({
    recipientUserId: generateUuid(),
    sourceService: 'tenancy',
    eventId: generateUuid(),
    type,
    title: 'Invoice ready',
    body: 'Your invoice is available',
    deepLink: '/invoices/123',
    data: { amount: 1200, labels: ['rent', 'water'] },
  });
}

describe('NotificationDeliveryService', () => {
  it('emits realtime notifications and sends typed push data', async () => {
    const notification = createNotification();
    const realtime: NotificationRealtimePort = {
      notificationCreated: jest.fn(),
      notificationReadStateUpdated: jest.fn(),
    };
    const push: PushDeliveryPort = { send: jest.fn(async () => undefined) };
    const service = new NotificationDeliveryService(realtime, push);

    await service.deliver([notification]);

    expect(realtime.notificationCreated).toHaveBeenCalledWith(
      notification.recipientUserId,
      expect.objectContaining({
        notificationId: notification.id,
        type: NotificationType.INVOICE,
      }),
    );
    expect(push.send).toHaveBeenCalledWith(NotificationCategory.INVOICE, [
      {
        userId: notification.recipientUserId,
        message: {
          title: notification.title,
          body: notification.body,
          data: {
            amount: '1200',
            labels: '["rent","water"]',
            notificationId: notification.id,
            type: NotificationType.INVOICE,
            deepLink: '/invoices/123',
          },
        },
      },
    ]);
  });

  it('does not call external delivery ports for an empty batch', async () => {
    const realtime: NotificationRealtimePort = {
      notificationCreated: jest.fn(),
      notificationReadStateUpdated: jest.fn(),
    };
    const push: PushDeliveryPort = { send: jest.fn(async () => undefined) };
    const service = new NotificationDeliveryService(realtime, push);

    await service.deliver([]);

    expect(realtime.notificationCreated).not.toHaveBeenCalled();
    expect(push.send).not.toHaveBeenCalled();
  });

  it('keeps push delivery available when realtime delivery throws', async () => {
    const notification = createNotification(NotificationType.ISSUE);
    const realtime: NotificationRealtimePort = {
      notificationCreated: jest.fn(() => {
        throw new Error('socket unavailable');
      }),
      notificationReadStateUpdated: jest.fn(),
    };
    const push: PushDeliveryPort = { send: jest.fn(async () => undefined) };
    const service = new NotificationDeliveryService(realtime, push);

    await expect(service.deliver([notification])).resolves.toBeUndefined();
    expect(push.send).toHaveBeenCalledWith(
      NotificationCategory.ISSUE,
      expect.any(Array),
    );
  });
});
