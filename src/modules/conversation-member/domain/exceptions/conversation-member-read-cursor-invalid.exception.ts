import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class ConversationMemberReadCursorInvalidException extends DomainException {
  constructor() {
    super('Read cursor is invalid', 422, 'READ_CURSOR_INVALID');
  }
}
