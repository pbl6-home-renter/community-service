import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class MessageContentInvalidException extends DomainException {
  constructor() {
    super('Message content is invalid', 422, 'MESSAGE_CONTENT_INVALID');
  }
}
