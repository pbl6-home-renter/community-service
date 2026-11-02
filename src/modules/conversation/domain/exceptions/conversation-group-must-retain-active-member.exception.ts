import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class ConversationGroupMustRetainActiveMemberException extends DomainException {
  constructor() {
    super(
      'A group conversation must retain at least one active user member',
      409,
      'GROUP_MUST_RETAIN_ACTIVE_MEMBER',
    );
  }
}
