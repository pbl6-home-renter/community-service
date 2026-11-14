import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class MessageReplyTargetInvalidException extends DomainException {
  constructor() {
    super(
      'The message being replied to is not available in this conversation',
      422,
      'MESSAGE_REPLY_TARGET_INVALID',
    );
  }
}
