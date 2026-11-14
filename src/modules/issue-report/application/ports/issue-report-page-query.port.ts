import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IssueReportEntity } from '../../domain/entities/issue-report.entity';
import { IssueStatus } from '../../domain/enums/issue-status.enum';

export interface IssueReportPageParams {
  contractIds: Uuid[];
  pageNo: number;
  pageSize: number;
  roomId?: Uuid;
  buildingId?: Uuid;
  status?: IssueStatus;
  order: 'asc' | 'desc';
}

export interface IssueReportPageQueryPort {
  findPage(
    params: IssueReportPageParams,
  ): Promise<PaginatedResult<IssueReportEntity>>;
}
