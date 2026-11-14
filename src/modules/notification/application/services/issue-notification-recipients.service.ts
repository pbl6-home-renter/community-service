import { Inject, Injectable } from '@nestjs/common';
import {
  ISSUE_CONTEXT_PORT,
  IssueContextPort,
} from 'modules/issue-report/application/ports/issue-context.port';
import { Uuid, isValidUuid } from 'shared/domain/value-objects/uuid.vo';
import { NotificationRequestedEventInvalidException } from '../../domain/exceptions/notification-requested-event-invalid.exception';

interface NotificationRecipientsPayload {
  sourceService: string;
  recipientUserIds: Uuid[];
  notification: { type: string; data?: Record<string, unknown> | null };
}

@Injectable()
export class IssueNotificationRecipientsService {
  constructor(
    @Inject(ISSUE_CONTEXT_PORT) private readonly contexts: IssueContextPort,
  ) {}

  async resolve(payload: NotificationRecipientsPayload): Promise<Uuid[]> {
    const data = payload.notification.data;
    if (
      payload.sourceService !== 'community-service' ||
      payload.notification.type !== 'issue' ||
      typeof data?.messageKey !== 'string' ||
      !data.messageKey.startsWith('issue.')
    ) {
      return payload.recipientUserIds;
    }
    const contractId = data.contractId;
    if (typeof contractId !== 'string' || !isValidUuid(contractId)) {
      throw new NotificationRequestedEventInvalidException(
        'Issue notification contractId must be a UUID',
      );
    }
    const context = await this.contexts.byContract(contractId as Uuid);
    if (!context) return [];
    const eligible = new Set([
      context.landlordId,
      ...(context.contractStatus === 'active'
        ? context.participantUserIds
        : []),
    ]);
    return payload.recipientUserIds.filter((id) => eligible.has(id));
  }
}
