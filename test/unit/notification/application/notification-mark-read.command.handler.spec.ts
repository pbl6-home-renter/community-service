import { NotificationMarkReadCommand } from 'modules/notification/application/commands/notification-mark-read.command';
import { NotificationMarkReadCommandHandler } from 'modules/notification/application/commands/notification-mark-read.command.handler';
import { NotificationEntity } from 'modules/notification/domain/entities/notification.entity';
import { NotificationNotFoundException } from 'modules/notification/domain/exceptions/notification-not-found.exception';
import { NotificationRepository } from 'modules/notification/domain/repositories/notification.repository';
import { NotificationRealtimePort } from 'modules/notification/application/ports/notification-realtime.port';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { NotificationType } from 'modules/notification/domain/enums/notification-type.enum';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

function createNotification(userId: ReturnType<typeof generateUuid>) {
  return NotificationEntity.create({
    recipientUserId: userId,
    sourceService: 'tenancy',
    eventId: generateUuid(),
    type: NotificationType.INVOICE,
    title: 'Invoice ready',
    body: 'Your invoice is available',
  });
}

function createUnitOfWork(
  context: TransactionContext,
  order: string[],
): IUnitOfWork {
  return {
    async run<T>(
      work: (transaction: TransactionContext) => Promise<T>,
    ): Promise<T> {
      const result = await work(context);
      order.push('committed');
      return result;
    },
  };
}

function createRepository(
  notification: NotificationEntity | null,
  context: TransactionContext,
): NotificationRepository {
  return {
    save: jest.fn(async () => undefined),
    findById: jest.fn(async () => notification),
    delete: jest.fn(async () => undefined),
    findByIdForUpdate: jest.fn(async (_id, passedContext) => {
      expect(passedContext).toBe(context);
      return notification;
    }),
    markAllRead: jest.fn(async () => 0),
  };
}

describe('NotificationMarkReadCommandHandler', () => {
  it('persists the first read inside the transaction and publishes state after commit', async () => {
    const userId = generateUuid();
    const context: TransactionContext = { kind: 'transaction' };
    const order: string[] = [];
    const notification = createNotification(userId);
    const repository = createRepository(notification, context);
    const realtime: NotificationRealtimePort = {
      notificationCreated: jest.fn(),
      notificationReadStateUpdated: jest.fn(() => order.push('realtime')),
    };
    const handler = new NotificationMarkReadCommandHandler(
      repository,
      createUnitOfWork(context, order),
      realtime,
    );

    const result = await handler.execute(
      new NotificationMarkReadCommand(userId, notification.id),
    );

    expect(result.readAt).toBeInstanceOf(Date);
    expect(repository.save).toHaveBeenCalledWith(notification, context);
    expect(order).toEqual(['committed', 'realtime']);
  });

  it('does not write or publish again when the notification was already read', async () => {
    const userId = generateUuid();
    const notification = createNotification(userId);
    notification.markRead(new Date('2026-11-01T00:00:00.000Z'));
    const context: TransactionContext = { kind: 'transaction' };
    const repository = createRepository(notification, context);
    const realtime: NotificationRealtimePort = {
      notificationCreated: jest.fn(),
      notificationReadStateUpdated: jest.fn(),
    };
    const handler = new NotificationMarkReadCommandHandler(
      repository,
      createUnitOfWork(context, []),
      realtime,
    );

    await handler.execute(
      new NotificationMarkReadCommand(userId, notification.id),
    );

    expect(repository.save).not.toHaveBeenCalled();
    expect(realtime.notificationReadStateUpdated).not.toHaveBeenCalled();
  });

  it('hides notifications owned by another user as not found', async () => {
    const notification = createNotification(generateUuid());
    const context: TransactionContext = { kind: 'transaction' };
    const repository = createRepository(notification, context);
    const realtime: NotificationRealtimePort = {
      notificationCreated: jest.fn(),
      notificationReadStateUpdated: jest.fn(),
    };
    const handler = new NotificationMarkReadCommandHandler(
      repository,
      createUnitOfWork(context, []),
      realtime,
    );

    await expect(
      handler.execute(
        new NotificationMarkReadCommand(generateUuid(), notification.id),
      ),
    ).rejects.toThrow(NotificationNotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
    expect(realtime.notificationReadStateUpdated).not.toHaveBeenCalled();
  });
});
