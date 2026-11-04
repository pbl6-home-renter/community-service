import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class ConversationGroupMembersInsufficientException extends DomainException {
  constructor() {
    super(
      'A group conversation requires at least two users other than the creator',
      422,
      'GROUP_MEMBERS_INSUFFICIENT',
    );
  }
}
