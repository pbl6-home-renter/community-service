import { DomainException } from 'shared/domain/exceptions/domain.exception';
import { EmailDeliveryStatus } from '../enums/email-delivery-status.enum';

export class EmailDeliveryStatusTransitionInvalidException extends DomainException {
  constructor(status: EmailDeliveryStatus, nextStatus: EmailDeliveryStatus) {
    super(
      `Email delivery cannot move from ${status} to ${nextStatus}`,
      409,
      'EMAIL_DELIVERY_STATUS_TRANSITION_INVALID',
    );
  }
}
