import { InboxRepository } from 'modules/inbox/application/ports/inbox.repository';
import { IssueContextPort } from 'modules/issue-report/application/ports/issue-context.port';
import { IssueNotificationRecipientsService } from 'modules/notification/application/services/issue-notification-recipients.service';
import { NotificationDeliveryService } from 'modules/notification/application/services/notification-delivery.service';
import { NotificationRealtimePort } from 'modules/notification/application/ports/notification-realtime.port';
import { NotificationRepository } from 'modules/notification/domain/repositories/notification.repository';
import { NotificationRequestedSubscriber } from 'modules/notification/presentation/messaging/notification-requested.subscriber';
import { MatchRequestSubscriber } from 'modules/notification/presentation/messaging/match-request.subscriber';
import { MATCH_REQUEST_INTEGRATION_EVENTS } from 'modules/notification/presentation/messaging/match-request-consumer.constants';
import { MATCH_REQUEST_NOTIFICATION_CONTENT } from 'modules/notification/application/constants/match-request-notification-content.constant';
import { PushDeliveryPort } from 'modules/push-device/application/ports/push-delivery.port';
import { NotificationCategory } from 'modules/notification-preference/domain/enums/notification-category.enum';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

jest.mock('@golevelup/nestjs-rabbitmq', () => ({
  RabbitSubscribe: () => () => undefined,
}));

describe('match request notifications', () => {
  it.each([
    [MATCH_REQUEST_INTEGRATION_EVENTS.CREATED, 'pending'],
    [MATCH_REQUEST_INTEGRATION_EVENTS.ACCEPTED, 'accepted'],
    [MATCH_REQUEST_INTEGRATION_EVENTS.REJECTED, 'rejected'],
    [MATCH_REQUEST_INTEGRATION_EVENTS.WITHDRAWN, 'withdrawn'],
  ] as const)('handles and deduplicates %s', async (eventType, status) => {
    const requestId = generateUuid();
    const recipientId = generateUuid();
    const actorId = generateUuid();
    const deepLink = `/roommates?matchRequestId=${requestId}`;
    const event = {
      id: generateUuid(),
      eventType,
      routingKey: eventType,
      aggregateType: 'MatchRequest',
      aggregateId: requestId,
      occurredAt: new Date().toISOString(),
      payload: {
        matchRequestId: requestId,
        actorUserId: actorId,
        actorDisplayName: 'Actor',
        recipientUserId: recipientId,
      },
    };
    const context: TransactionContext = { kind: 'transaction' };
    const seen = new Set<string>();
    const inbox = {
      recordIfNew: jest.fn(async (id: string) => {
        if (seen.has(id)) return false;
        seen.add(id);
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
    const shared = new NotificationRequestedSubscriber(
      inbox,
      notifications,
      unitOfWork,
      new NotificationDeliveryService(realtime, push),
      new IssueNotificationRecipientsService(issueContext),
    );
    const subscriber = new MatchRequestSubscriber(shared);
    await subscriber.handle(event);
    await subscriber.handle(event);
    expect(notifications.save).toHaveBeenCalledTimes(1);
    expect((notifications.save as jest.Mock).mock.calls[0][0]).toMatchObject({
      recipientUserId: recipientId,
      deepLink,
      ...MATCH_REQUEST_NOTIFICATION_CONTENT[status],
      data: {
        matchRequestId: requestId,
        actorUserId: actorId,
        actorDisplayName: 'Actor',
        status,
        messageKey: eventType,
      },
    });
    expect(inbox.recordIfNew).toHaveBeenCalledWith(
      event.id,
      eventType,
      context,
    );
    expect(realtime.notificationCreated).toHaveBeenCalledTimes(1);
    expect(realtime.notificationCreated).toHaveBeenCalledWith(
      recipientId,
      expect.objectContaining({
        deepLink,
        data: expect.objectContaining({
          actorUserId: actorId,
          actorDisplayName: 'Actor',
          matchRequestId: requestId,
        }),
      }),
    );
    expect(push.send).toHaveBeenCalledTimes(1);
    const content = MATCH_REQUEST_NOTIFICATION_CONTENT[status];
    expect(push.send).toHaveBeenCalledWith(NotificationCategory.SYSTEM, [
      expect.objectContaining({
        userId: recipientId,
        message: expect.objectContaining({
          title: content.title,
          body: content.body,
          data: expect.objectContaining({
            actorUserId: actorId,
            actorDisplayName: 'Actor',
            matchRequestId: requestId,
            deepLink,
          }),
        }),
      }),
    ]);
    await expect(
      subscriber.handle({
        ...event,
        id: generateUuid(),
        payload: { ...event.payload, matchRequestId: generateUuid() },
      }),
    ).rejects.toThrow();
    expect(notifications.save).toHaveBeenCalledTimes(1);
    await expect(
      subscriber.handle({
        ...event,
        id: generateUuid(),
        payload: { ...event.payload, actorUserId: recipientId },
      }),
    ).rejects.toThrow();
    await subscriber.handle({
      ...event,
      id: generateUuid(),
      payload: { matchRequestId: requestId, recipientUserId: recipientId },
    });
    expect(notifications.save).toHaveBeenCalledTimes(2);
  });
});
