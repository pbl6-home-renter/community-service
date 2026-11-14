import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class IssueReportForbiddenException extends DomainException {
  constructor() {
    super('Issue report access denied', 403, 'FORBIDDEN');
  }
}
