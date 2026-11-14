import { IQuery } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class IssueReportOwnershipLookupQuery implements IQuery {
  constructor(
    readonly issueId: Uuid,
    readonly actorUserId: Uuid,
  ) {}
}
