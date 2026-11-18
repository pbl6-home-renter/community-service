import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IssueReportEntity } from '../../../domain/entities/issue-report.entity';
import { IssueStatus } from '../../../domain/enums/issue-status.enum';
import { IssueReportForbiddenException } from '../../../domain/exceptions/issue-report-forbidden.exception';
import { IssueReportNotFoundException } from '../../../domain/exceptions/issue-report-not-found.exception';
import { IssueReportRepository } from '../../../domain/repositories/issue-report.repository';
import { ISSUE_REPORT_DI_TOKEN } from '../../../issue-report.di-token';
import {
  ISSUE_CONTEXT_PORT,
  IssueContext,
  IssueContextPort,
} from '../../ports/issue-context.port';
import { ISSUE_MEDIA_PORT, IssueMediaPort } from '../../ports/issue-media.port';
import { IssueAccessService } from '../../services/issue-access.service';
import { IssueReportGetByIdQuery } from './issue-report-get-by-id.query';

const MAX_ISSUE_MEDIA_FILES = 5;

export interface IssueReportDetailResult {
  issue: IssueReportEntity;
  context: IssueContext;
  photoIds: Uuid[];
  canUpdate: boolean;
  canCancel: boolean;
  canUploadPhotos: boolean;
}

@QueryHandler(IssueReportGetByIdQuery)
export class IssueReportGetByIdQueryHandler implements IQueryHandler<IssueReportGetByIdQuery> {
  constructor(
    @Inject(ISSUE_REPORT_DI_TOKEN.REPOSITORY)
    private readonly reports: IssueReportRepository,
    @Inject(ISSUE_CONTEXT_PORT) private readonly contexts: IssueContextPort,
    @Inject(ISSUE_MEDIA_PORT) private readonly media: IssueMediaPort,
  ) {}

  async execute(
    query: IssueReportGetByIdQuery,
  ): Promise<IssueReportDetailResult> {
    const issue = await this.reports.findById(query.issueId);
    if (!issue) throw new IssueReportNotFoundException();
    const context = await this.contexts.byContract(issue.contractId);
    if (
      !context ||
      context.roomId !== issue.roomId ||
      !IssueAccessService.canView(query.actor, context)
    )
      throw new IssueReportForbiddenException();
    const active =
      issue.status === IssueStatus.OPEN ||
      issue.status === IssueStatus.IN_PROGRESS;
    const photoIds = await this.media.completedPhotoIds(issue.id);
    return {
      issue,
      context,
      photoIds,
      canUpdate: active && IssueAccessService.canManage(query.actor, context),
      canCancel: active && issue.creatorId === query.actor.id,
      canUploadPhotos: active && photoIds.length < MAX_ISSUE_MEDIA_FILES,
    };
  }
}
