import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class NotificationNotFoundException extends DomainException {
  constructor() {
    super('Notification not found', 404, 'NOT_FOUND');
  }
}
