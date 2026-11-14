import { InboxRepository } from 'modules/inbox/application/ports/inbox.repository';
import { IssueContextPort } from 'modules/issue-report/application/ports/issue-context.port';
import { NotificationDeliveryService } from 'modules/notification/application/services/notification-delivery.service';
import { IssueNotificationRecipientsService } from 'modules/notification/application/services/issue-notification-recipients.service';
import { NotificationRealtimePort } from 'modules/notification/application/ports/notification-realtime.port';
import { NotificationRepository } from 'modules/notification/domain/repositories/notification.repository';
import { NotificationRequestedSubscriber } from 'modules/notification/presentation/messaging/notification-requested.subscriber';
import { PushDeliveryPort } from 'modules/push-device/application/ports/push-delivery.port';
import { NotificationCategory } from 'modules/notification-preference/domain/enums/notification-category.enum';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

jest.mock('@golevelup/nestjs-rabbitmq', () => ({
  RabbitSubscribe: () => () => undefined,
}));

describe('invoice notification request', () => {
  it('stores one inbox item per tenant, emits Socket and uses invoice push preference once', async () => {
    const invoiceId = generateUuid();
    const contractId = generateUuid();
    const firstTenantId = generateUuid();
    const secondTenantId = generateUuid();
    const event = {
      id: generateUuid(),
      eventType: 'notification.requested',
      routingKey: 'notification.requested',
      aggregateType: 'Invoice',
      aggregateId: invoiceId,
      occurredAt: '2026-11-15T10:00:00.000Z',
      payload: {
        sourceService: 'tenancy-service',
        recipientUserIds: [firstTenantId, secondTenantId, firstTenantId],
        notification: {
          type: 'invoice',
          title: 'Hóa đơn đã được phát hành',
          body: 'Hóa đơn kỳ 2026-11 đã được phát hành.',
          deepLink: `/invoices/${invoiceId}`,
          data: { invoiceId, contractId, period: '2026-11' },
        },
      },
    };
    const context: TransactionContext = { kind: 'transaction' };
    const received = new Set<string>();
    const inbox = {
      recordIfNew: jest.fn(async (id: string) => {
        if (received.has(id)) return false;
        received.add(id);
        return true;
      }),
    } as unknown as InboxRepository;
    const notifications = {
      save: jest.fn(async () => undefined),
    } as unknown as NotificationRepository;
    const unitOfWork = {
      run: jest.fn(async <T>(work: (ctx: TransactionContext) => Promise<T>) =>
        work(context),
      ),
    } as unknown as IUnitOfWork;
    const realtime = {
      notificationCreated: jest.fn(),
      notificationReadStateUpdated: jest.fn(),
    } as NotificationRealtimePort;
    const push = { send: jest.fn(async () => undefined) } as PushDeliveryPort;
    const issueContext = {
      byContract: jest.fn(),
    } as unknown as IssueContextPort;
    const subscriber = new NotificationRequestedSubscriber(
      inbox,
      notifications,
      unitOfWork,
      new NotificationDeliveryService(realtime, push),
      new IssueNotificationRecipientsService(issueContext),
    );

    await subscriber.handle(event);
    await subscriber.handle(event);

    expect(issueContext.byContract).not.toHaveBeenCalled();
    expect(inbox.recordIfNew).toHaveBeenCalledWith(
      event.id,
      event.eventType,
      context,
    );
    expect(notifications.save).toHaveBeenCalledTimes(2);
    for (const [notification, transaction] of (
      notifications.save as jest.Mock
    ).mock.calls) {
      expect(transaction).toBe(context);
      expect(notification.deepLink).toBe(`/invoices/${invoiceId}`);
    }
    expect(realtime.notificationCreated).toHaveBeenCalledTimes(2);
    expect(push.send).toHaveBeenCalledTimes(1);
    expect(push.send).toHaveBeenCalledWith(
      NotificationCategory.INVOICE,
      expect.arrayContaining([
        expect.objectContaining({ userId: firstTenantId }),
        expect.objectContaining({ userId: secondTenantId }),
      ]),
    );
  });
});
