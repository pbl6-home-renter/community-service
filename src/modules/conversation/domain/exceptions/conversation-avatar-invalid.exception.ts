import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class ConversationAvatarInvalidException extends DomainException {
  constructor() {
    super(
      'Conversation avatar media is invalid',
      422,
      'CONVERSATION_AVATAR_INVALID',
    );
  }
}
