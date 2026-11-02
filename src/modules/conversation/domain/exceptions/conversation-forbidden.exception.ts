import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class ConversationForbiddenException extends DomainException {
  constructor() {
    super('The user is not a member of this conversation', 403, 'FORBIDDEN');
  }
}
