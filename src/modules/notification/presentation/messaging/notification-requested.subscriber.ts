import { Inject, Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { IntegrationEvent } from 'shared/application/messaging/integration-event';
import { INBOX_DI_TOKEN } from 'modules/inbox/inbox.di-token';
import { InboxRepository } from 'modules/inbox/application/ports/inbox.repository';
import { NotificationEntity } from '../../domain/entities/notification.entity';
import { NotificationRepository } from '../../domain/repositories/notification.repository';
import { NOTIFICATION_DI_TOKEN } from '../../notification.di-token';
import {
  NOTIFICATION_CONSUMER_NAME,
  NOTIFICATION_CONSUMER_QUEUE,
  NOTIFICATION_INTEGRATION_EVENTS,
} from './notification-consumer.constants';
import {
  NotificationRequestedIntegrationEvent,
  NotificationRequestedEventValidator,
} from './notification-requested.integration-event';
import { ConsumerRegistry } from 'shared/infrastructure/messaging/rabbitmq/consumer/consumer-registry';
import { NotificationDeliveryPort } from '../../application/ports/notification-delivery.port';
import { IssueNotificationRecipientsService } from '../../application/services/issue-notification-recipients.service';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

@Injectable()
export class NotificationRequestedSubscriber {
  private readonly logger = new Logger(NotificationRequestedSubscriber.name);

  constructor(
    @Inject(INBOX_DI_TOKEN.REPOSITORY)
    private readonly inbox: InboxRepository,
    @Inject(NOTIFICATION_DI_TOKEN.REPOSITORY)
    private readonly notifications: NotificationRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(NOTIFICATION_DI_TOKEN.DELIVERY)
    private readonly delivery: NotificationDeliveryPort,
    private readonly issueRecipients: IssueNotificationRecipientsService,
  ) {}

  @RabbitSubscribe({
    name: ConsumerRegistry.define({
      name: NOTIFICATION_CONSUMER_NAME,
      queue: NOTIFICATION_CONSUMER_QUEUE,
      routingKeys: [NOTIFICATION_INTEGRATION_EVENTS.REQUESTED],
    }),
  })
  async handle(event: IntegrationEvent): Promise<void> {
    NotificationRequestedEventValidator.assert(event);
    this.warnIfMissingMessageKey(event);
    const recipients = await this.issueRecipients.resolve(event.payload);
    await this.persistAndDeliver(event, recipients);
  }

  async persistAndDeliver(
    event: NotificationRequestedIntegrationEvent,
    recipients: Uuid[],
  ): Promise<void> {
    const notifications = await this.handleOnce(
      event,
      recipients,
      event.payload.notification,
    );
    // Best-effort and off the ack path: the inbox row is the source of truth,
    // so a lost push only means the user sees it next time they open the list.
    void this.delivery.deliver(notifications);
  }

  /**
   * Convention (docs/notifications.md): every notification carries `data.messageKey`
   * so clients can translate it and history stays renderable. Not enforced yet so
   * producers that predate the convention keep working.
   */
  private warnIfMissingMessageKey(
    event: NotificationRequestedIntegrationEvent,
  ): void {
    const messageKey = event.payload.notification.data?.messageKey;
    if (typeof messageKey === 'string' && messageKey.trim()) return;
    this.logger.warn(
      `Notification event ${event.id} from ${event.payload.sourceService} has no data.messageKey; clients will show the raw title/body`,
    );
  }

  private handleOnce(
    event: NotificationRequestedIntegrationEvent,
    recipients: Uuid[],
    content: NotificationRequestedIntegrationEvent['payload']['notification'],
  ): Promise<NotificationEntity[]> {
    return this.unitOfWork.run(async (context) => {
      const isNew = await this.inbox.recordIfNew(
        event.id,
        event.eventType,
        context,
      );
      if (!isNew) return [];

      const recipientUserIds = new Set(recipients);
      const notifications: NotificationEntity[] = [];
      for (const recipientUserId of recipientUserIds) {
        const notification = NotificationEntity.create({
          recipientUserId,
          sourceService: event.payload.sourceService,
          eventId: event.id,
          type: content.type,
          title: content.title,
          body: content.body,
          deepLink: content.deepLink,
          data: content.data,
        });
        await this.notifications.save(notification, context);
        notifications.push(notification);
      }
      return notifications;
    });
  }
}
