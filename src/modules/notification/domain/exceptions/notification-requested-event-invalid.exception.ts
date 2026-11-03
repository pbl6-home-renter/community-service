import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class NotificationRequestedEventInvalidException extends DomainException {
  constructor(reason: string) {
    super(
      `Notification requested event is invalid: ${reason}`,
      422,
      'NOTIFICATION_EVENT_INVALID',
    );
  }
}
