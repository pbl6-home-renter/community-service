import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class EmailSendRequestedEventInvalidException extends DomainException {
  constructor(reason: string) {
    super(
      `Email send request is invalid: ${reason}`,
      422,
      'EMAIL_REQUEST_INVALID',
    );
  }
}
