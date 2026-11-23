import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export type IssueNotificationKey =
  'issue.created' | 'issue.updated' | 'issue.cancelled';

/** Readable Vietnamese fallback for clients that do not translate `messageKey` (docs/notifications.md). */
const ISSUE_NOTIFICATION_TEXT: Record<
  IssueNotificationKey,
  { title: string; body: string }
> = {
  'issue.created': {
    title: 'Sự cố mới',
    body: 'Có một sự cố mới cần xem.',
  },
  'issue.updated': {
    title: 'Sự cố đã được cập nhật',
    body: 'Tiến độ xử lý sự cố đã thay đổi.',
  },
  'issue.cancelled': {
    title: 'Sự cố đã bị hủy',
    body: 'Một báo cáo sự cố đã bị hủy.',
  },
};

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
        ...ISSUE_NOTIFICATION_TEXT[messageKey],
        deepLink: `/issues/${aggregateId}`,
        data: { issueId: aggregateId, contractId, messageKey },
      },
    };
  }
}
