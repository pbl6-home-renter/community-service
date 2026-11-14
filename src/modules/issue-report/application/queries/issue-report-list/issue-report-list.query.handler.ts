import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { IssueReportEntity } from '../../../domain/entities/issue-report.entity';
import { ISSUE_REPORT_DI_TOKEN } from '../../../issue-report.di-token';
import {
  ISSUE_CONTEXT_PORT,
  IssueContext,
  IssueContextPort,
} from '../../ports/issue-context.port';
import { IssueReportPageQueryPort } from '../../ports/issue-report-page-query.port';
import { IssueAccessService } from '../../services/issue-access.service';
import { IssueReportListQuery } from './issue-report-list.query';

export interface IssueReportListItem {
  issue: IssueReportEntity;
  context: IssueContext;
}

@QueryHandler(IssueReportListQuery)
export class IssueReportListQueryHandler implements IQueryHandler<IssueReportListQuery> {
  constructor(
    @Inject(ISSUE_CONTEXT_PORT) private readonly contexts: IssueContextPort,
    @Inject(ISSUE_REPORT_DI_TOKEN.PAGE_QUERY)
    private readonly reports: IssueReportPageQueryPort,
  ) {}

  async execute(
    query: IssueReportListQuery,
  ): Promise<PaginatedResult<IssueReportListItem>> {
    const contractIds = await this.contexts.visibleContracts(
      query.actor.id,
      query.actor.role,
    );
    const result = await this.reports.findPage({
      contractIds,
      pageNo: query.pageNo,
      pageSize: query.pageSize,
      order: query.order,
      roomId: query.roomId,
      status: query.status,
      buildingId: query.buildingId,
    });
    const contractIdsInPage = [
      ...new Set(result.data.map((issue) => issue.contractId)),
    ];
    const contextResults = await Promise.all(
      contractIdsInPage.map((id) => this.contexts.byContract(id)),
    );
    const contexts = new Map(
      contractIdsInPage.map((id, index) => [id, contextResults[index]]),
    );
    const data = result.data.flatMap((issue) => {
      const context = contexts.get(issue.contractId);
      return context &&
        context.roomId === issue.roomId &&
        IssueAccessService.canView(query.actor, context)
        ? [{ issue, context }]
        : [];
    });
    return { data, pagination: result.pagination };
  }
}
