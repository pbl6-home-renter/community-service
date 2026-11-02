import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class ConversationMemberNotFoundException extends DomainException {
  constructor() {
    super('Conversation member not found', 404, 'NOT_FOUND');
  }
}
