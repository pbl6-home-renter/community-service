import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class ConversationLastAdminCannotBeDemotedException extends DomainException {
  constructor() {
    super(
      'The last active admin cannot be demoted',
      409,
      'LAST_ADMIN_CANNOT_BE_DEMOTED',
    );
  }
}
