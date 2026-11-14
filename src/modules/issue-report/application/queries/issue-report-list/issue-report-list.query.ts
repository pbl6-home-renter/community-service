import { IQuery } from '@nestjs/cqrs';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IssueStatus } from '../../../domain/enums/issue-status.enum';

export class IssueReportListQuery implements IQuery {
  constructor(
    readonly actor: AuthenticatedUser,
    readonly pageNo: number,
    readonly pageSize: number,
    readonly order: 'asc' | 'desc',
    readonly roomId?: Uuid,
    readonly status?: IssueStatus,
    readonly buildingId?: Uuid,
  ) {}
}
