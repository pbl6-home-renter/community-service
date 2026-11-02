import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class ConversationNotFoundException extends DomainException {
  constructor() {
    super('Conversation not found', 404, 'NOT_FOUND');
  }
}
