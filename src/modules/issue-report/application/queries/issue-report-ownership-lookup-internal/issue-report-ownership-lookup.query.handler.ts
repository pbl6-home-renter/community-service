import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IssueReportRepository } from '../../../domain/repositories/issue-report.repository';
import { ISSUE_REPORT_DI_TOKEN } from '../../../issue-report.di-token';
import {
  ISSUE_CONTEXT_PORT,
  IssueContextPort,
} from '../../ports/issue-context.port';
import { IssueReportOwnershipLookupQuery } from './issue-report-ownership-lookup.query';

export interface IssueOwnershipResult {
  landlordId: null;
  participantUserIds: Uuid[];
  status: string;
}

@QueryHandler(IssueReportOwnershipLookupQuery)
export class IssueReportOwnershipLookupQueryHandler implements IQueryHandler<IssueReportOwnershipLookupQuery> {
  constructor(
    @Inject(ISSUE_REPORT_DI_TOKEN.REPOSITORY)
    private readonly reports: IssueReportRepository,
    @Inject(ISSUE_CONTEXT_PORT) private readonly contexts: IssueContextPort,
  ) {}

  async execute(
    query: IssueReportOwnershipLookupQuery,
  ): Promise<IssueOwnershipResult | null> {
    const issue = await this.reports.findById(query.issueId);
    if (!issue) return null;
    const context = await this.contexts.byContract(issue.contractId);
    if (!context || context.roomId !== issue.roomId) return null;
    const allowed =
      context.landlordId === query.actorUserId ||
      (context.contractStatus === 'active' &&
        context.participantUserIds.includes(query.actorUserId));
    return {
      landlordId: null,
      participantUserIds: allowed ? [query.actorUserId] : [],
      status: issue.status,
    };
  }
}
