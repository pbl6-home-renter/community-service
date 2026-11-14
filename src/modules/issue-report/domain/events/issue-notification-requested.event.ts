import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export type IssueNotificationKey =
  'issue.created' | 'issue.updated' | 'issue.cancelled';

export class IssueNotificationRequestedEvent implements DomainEvent {
  readonly eventType = 'notification.requested';
  readonly routingKey = 'notification.requested';
  readonly aggregateType = 'issue_report';
  readonly occurredAt = new Date();
  readonly payload: Record<string, unknown>;

  constructor(
    readonly aggregateId: Uuid,
    contractId: Uuid,
    recipients: Uuid[],
    messageKey: IssueNotificationKey,
  ) {
    this.payload = {
      sourceService: 'community-service',
      recipientUserIds: [...new Set(recipients)],
      notification: {
        type: 'issue',
        title: 'Issue update',
        body: 'There is an update to an issue report.',
        deepLink: `/issues/${aggregateId}`,
        data: { issueId: aggregateId, contractId, messageKey },
      },
    };
  }
}
