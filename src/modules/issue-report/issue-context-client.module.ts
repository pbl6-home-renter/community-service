import { Module } from '@nestjs/common';
import { ISSUE_CONTEXT_PORT } from './application/ports/issue-context.port';
import { TenancyIssueContextService } from './infrastructure/services/tenancy-issue-context.service';

@Module({
  providers: [
    TenancyIssueContextService,
    { provide: ISSUE_CONTEXT_PORT, useExisting: TenancyIssueContextService },
  ],
  exports: [ISSUE_CONTEXT_PORT],
})
export class IssueContextClientModule {}
