import { Inject, Injectable } from '@nestjs/common';
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
    const recipients = await this.issueRecipients.resolve(event.payload);
    const notifications = await this.handleOnce(event, recipients);
    // Best-effort and off the ack path: the inbox row is the source of truth,
    // so a lost push only means the user sees it next time they open the list.
    void this.delivery.deliver(notifications);
  }

  private handleOnce(
    event: NotificationRequestedIntegrationEvent,
    recipients: Uuid[],
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
          type: event.payload.notification.type,
          title: event.payload.notification.title,
          body: event.payload.notification.body,
          deepLink: event.payload.notification.deepLink,
          data: event.payload.notification.data,
        });
        await this.notifications.save(notification, context);
        notifications.push(notification);
      }
      return notifications;
    });
  }
}
