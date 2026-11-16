import { Injectable } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { IntegrationEvent } from 'shared/application/messaging/integration-event';
import { isValidUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConsumerRegistry } from 'shared/infrastructure/messaging/rabbitmq/consumer/consumer-registry';
import { MATCH_REQUEST_NOTIFICATION_CONTENT } from '../../application/constants/match-request-notification-content.constant';
import { NotificationType } from '../../domain/enums/notification-type.enum';
import { NotificationRequestedEventInvalidException } from '../../domain/exceptions/notification-requested-event-invalid.exception';
import { NotificationRequestedSubscriber } from './notification-requested.subscriber';
import {
  MATCH_REQUEST_CONSUMER_NAME,
  MATCH_REQUEST_CONSUMER_QUEUE,
  MATCH_REQUEST_INTEGRATION_EVENTS,
  MATCH_REQUEST_EVENT_STATUSES,
  MATCH_REQUEST_DEEP_LINK_PATH,
} from './match-request-consumer.constants';

@Injectable()
export class MatchRequestSubscriber {
  constructor(
    private readonly notifications: NotificationRequestedSubscriber,
  ) {}

  @RabbitSubscribe({
    name: ConsumerRegistry.define({
      name: MATCH_REQUEST_CONSUMER_NAME,
      queue: MATCH_REQUEST_CONSUMER_QUEUE,
      routingKeys: Object.values(MATCH_REQUEST_INTEGRATION_EVENTS),
    }),
  })
  async handle(event: IntegrationEvent): Promise<void> {
    const status = Object.hasOwn(MATCH_REQUEST_EVENT_STATUSES, event.eventType)
      ? MATCH_REQUEST_EVENT_STATUSES[
          event.eventType as keyof typeof MATCH_REQUEST_EVENT_STATUSES
        ]
      : undefined;
    const payload = event.payload;
    if (
      !status ||
      !isValidUuid(event.id) ||
      !isValidUuid(event.aggregateId) ||
      event.aggregateType !== 'MatchRequest' ||
      !payload ||
      typeof payload !== 'object' ||
      typeof payload.matchRequestId !== 'string' ||
      payload.matchRequestId.toLowerCase() !==
        event.aggregateId.toLowerCase() ||
      typeof payload.recipientUserId !== 'string' ||
      !isValidUuid(payload.recipientUserId) ||
      (payload.actorUserId !== undefined &&
        (typeof payload.actorUserId !== 'string' ||
          !isValidUuid(payload.actorUserId) ||
          payload.actorUserId.toLowerCase() ===
            payload.recipientUserId.toLowerCase())) ||
      (payload.actorDisplayName !== undefined &&
        (typeof payload.actorDisplayName !== 'string' ||
          !payload.actorDisplayName.trim() ||
          payload.actorDisplayName.length > 255))
    ) {
      throw new NotificationRequestedEventInvalidException(
        'Invalid match request event',
      );
    }
    const recipientId = payload.recipientUserId as Uuid;
    const content = MATCH_REQUEST_NOTIFICATION_CONTENT[status];
    await this.notifications.persistAndDeliver(
      {
        id: event.id,
        eventType: event.eventType,
        payload: {
          sourceService: 'tenancy-service',
          recipientUserIds: [recipientId],
          notification: {
            type: NotificationType.SYSTEM,
            ...content,
            deepLink: `${MATCH_REQUEST_DEEP_LINK_PATH}?matchRequestId=${event.aggregateId}`,
            data: {
              matchRequestId: event.aggregateId,
              ...(payload.actorUserId
                ? { actorUserId: payload.actorUserId }
                : {}),
              ...(payload.actorDisplayName
                ? { actorDisplayName: payload.actorDisplayName }
                : {}),
              status,
              messageKey: event.eventType,
            },
          },
        },
      },
      [recipientId],
    );
  }
}
