import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  IssueNotificationKey,
  IssueNotificationRequestedEvent,
} from '../../domain/events/issue-notification-requested.event';
import { IssueContext } from '../ports/issue-context.port';

export class IssueNotificationService {
  static event(
    issueId: Uuid,
    actorId: Uuid,
    context: IssueContext,
    key: IssueNotificationKey,
  ): IssueNotificationRequestedEvent | null {
    const members =
      context.contractStatus === 'active' ? context.participantUserIds : [];
    const recipients = [...new Set([context.landlordId, ...members])].filter(
      (id) => id !== actorId,
    );
    return recipients.length
      ? new IssueNotificationRequestedEvent(
          issueId,
          context.contractId,
          recipients,
          key,
        )
      : null;
  }
}
