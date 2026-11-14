import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class CannotCancelResolvedIssueException extends DomainException {
  constructor() {
    super(
      'A resolved issue cannot be cancelled',
      422,
      'CANNOT_CANCEL_RESOLVED_ISSUE',
    );
  }
}
