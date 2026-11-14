import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class IssueReportNotFoundException extends DomainException {
  constructor() {
    super('Issue report not found', 404, 'NOT_FOUND');
  }
}
