import { Logger } from '@nestjs/common';
import { InboxRepository } from 'modules/inbox/application/ports/inbox.repository';
import { NotificationDeliveryPort } from 'modules/notification/application/ports/notification-delivery.port';
import { IssueNotificationRecipientsService } from 'modules/notification/application/services/issue-notification-recipients.service';
import { NotificationRepository } from 'modules/notification/domain/repositories/notification.repository';
import { NotificationRequestedSubscriber } from 'modules/notification/presentation/messaging/notification-requested.subscriber';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

jest.mock('@golevelup/nestjs-rabbitmq', () => ({
  RabbitSubscribe: () => () => undefined,
}));

const buildEvent = (data: Record<string, unknown> | null) => ({
  id: generateUuid(),
  eventType: 'notification.requested',
  routingKey: 'notification.requested',
  aggregateType: 'Building',
  aggregateId: generateUuid(),
  occurredAt: '2026-11-23T10:00:00.000Z',
  payload: {
    sourceService: 'tenancy-service',
    recipientUserIds: [generateUuid()],
    notification: {
      type: 'system',
      title: 'BUILDING_APPROVED_TITLE',
      body: 'BUILDING_APPROVED_BODY',
      data,
    },
  },
});

describe('notification.requested messageKey convention', () => {
  const context: TransactionContext = { kind: 'transaction' };
  let warn: jest.SpyInstance;
  let subscriber: NotificationRequestedSubscriber;
  let save: jest.Mock;

  beforeEach(() => {
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    save = jest.fn(async () => undefined);
    subscriber = new NotificationRequestedSubscriber(
      { recordIfNew: jest.fn(async () => true) } as unknown as InboxRepository,
      { save } as unknown as NotificationRepository,
      {
        run: jest.fn(async <T>(work: (ctx: TransactionContext) => Promise<T>) =>
          work(context),
        ),
      } as unknown as IUnitOfWork,
      { deliver: jest.fn(async () => undefined) } as NotificationDeliveryPort,
      new IssueNotificationRecipientsService({
        byContract: jest.fn(),
      } as never),
    );
  });

  afterEach(() => warn.mockRestore());

  it('does not warn when data.messageKey is present', async () => {
    await subscriber.handle(
      buildEvent({ messageKey: 'building.approved', buildingName: 'Sunrise' }),
    );

    expect(warn).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it.each([null, {}, { messageKey: '  ' }])(
    'warns but still stores the notification when messageKey is missing (%j)',
    async (data) => {
      await subscriber.handle(buildEvent(data));

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('has no data.messageKey'),
      );
      expect(save).toHaveBeenCalledTimes(1);
    },
  );
});
