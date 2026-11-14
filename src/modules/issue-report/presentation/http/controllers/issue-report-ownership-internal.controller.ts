import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiExcludeController } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { InternalOnly } from 'shared/presentation/decorators/auth/internal-only.decorator';
import { IssueOwnershipResult } from '../../../application/queries/issue-report-ownership-lookup-internal/issue-report-ownership-lookup.query.handler';
import { IssueReportOwnershipLookupQuery } from '../../../application/queries/issue-report-ownership-lookup-internal/issue-report-ownership-lookup.query';

@ApiExcludeController()
@InternalOnly()
@Controller('internal/ownership/issue-report')
export class IssueReportOwnershipInternalController {
  constructor(private readonly queries: QueryBus) {}

  @Get(':issueId')
  async lookup(
    @Param('issueId', ParseUUIDPipe) issueId: Uuid,
    @Query('actorUserId', ParseUUIDPipe) actorUserId: Uuid,
  ): Promise<IssueOwnershipResult> {
    const result: IssueOwnershipResult | null = await this.queries.execute(
      new IssueReportOwnershipLookupQuery(issueId, actorUserId),
    );
    if (!result) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND' });
    return result;
  }
}
