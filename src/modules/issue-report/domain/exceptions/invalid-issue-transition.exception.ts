import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class InvalidIssueTransitionException extends DomainException {
  constructor() {
    super('Invalid issue status transition', 409, 'INVALID_ISSUE_TRANSITION');
  }
}
