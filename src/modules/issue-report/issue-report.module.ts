import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxModule } from 'modules/outbox/outbox.module';
import { IssueReportCancelCommandHandler } from './application/commands/issue-report-cancel/issue-report-cancel.command.handler';
import { IssueReportCreateCommandHandler } from './application/commands/issue-report-create/issue-report-create.command.handler';
import { IssueReportUpdateCommandHandler } from './application/commands/issue-report-update/issue-report-update.command.handler';
import { ISSUE_MEDIA_PORT } from './application/ports/issue-media.port';
import { IssueReportGetByIdQueryHandler } from './application/queries/issue-report-get-by-id/issue-report-get-by-id.query.handler';
import { IssueReportListQueryHandler } from './application/queries/issue-report-list/issue-report-list.query.handler';
import { IssueReportOwnershipLookupQueryHandler } from './application/queries/issue-report-ownership-lookup-internal/issue-report-ownership-lookup.query.handler';
import { IssueReportTypeormEntity } from './infrastructure/persistence/issue-report.typeorm-entity';
import { TypeOrmIssueReportRepository } from './infrastructure/persistence/issue-report.repository';
import { TypeOrmIssueReportPageQuery } from './infrastructure/queries/typeorm-issue-report-page.query';
import { IdentityIssueMediaService } from './infrastructure/services/identity-issue-media.service';
import { IssueContextClientModule } from './issue-context-client.module';
import { ISSUE_REPORT_DI_TOKEN } from './issue-report.di-token';
import { IssueReportController } from './presentation/http/controllers/issue-report.controller';
import { IssueReportOwnershipInternalController } from './presentation/http/controllers/issue-report-ownership-internal.controller';
import { MyIssueReportController } from './presentation/http/controllers/my-issue-report.controller';

@Module({
  imports: [
    CqrsModule,
    OutboxModule,
    IssueContextClientModule,
    TypeOrmModule.forFeature([IssueReportTypeormEntity]),
  ],
  controllers: [
    IssueReportController,
    MyIssueReportController,
    IssueReportOwnershipInternalController,
  ],
  providers: [
    IssueReportCreateCommandHandler,
    IssueReportUpdateCommandHandler,
    IssueReportCancelCommandHandler,
    IssueReportGetByIdQueryHandler,
    IssueReportListQueryHandler,
    IssueReportOwnershipLookupQueryHandler,
    TypeOrmIssueReportRepository,
    TypeOrmIssueReportPageQuery,
    IdentityIssueMediaService,
    {
      provide: ISSUE_REPORT_DI_TOKEN.REPOSITORY,
      useExisting: TypeOrmIssueReportRepository,
    },
    {
      provide: ISSUE_REPORT_DI_TOKEN.PAGE_QUERY,
      useExisting: TypeOrmIssueReportPageQuery,
    },
    { provide: ISSUE_MEDIA_PORT, useExisting: IdentityIssueMediaService },
  ],
})
export class IssueReportModule {}
