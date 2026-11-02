import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class MessageConversationNotFoundException extends DomainException {
  constructor() {
    super('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
  }
}
