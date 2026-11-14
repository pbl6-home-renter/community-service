import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { ApiPaginatedSuccessResponse } from 'shared/presentation/decorators/api-paginated-success-response.decorator';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { PaginatedResponseDto } from 'shared/presentation/pagination/paginated.response.dto';
import { IssueReportListItem } from '../../../application/queries/issue-report-list/issue-report-list.query.handler';
import { IssueReportListQuery } from '../../../application/queries/issue-report-list/issue-report-list.query';
import { IssueReportListRequestDto } from '../requests/issue-report-list.request.dto';
import { IssueReportListItemResponseDto } from '../responses/issue-report-list-item.response.dto';

@ApiTags('IssueReport')
@ApiBearerAuth()
@Controller('me/issues')
export class MyIssueReportController {
  constructor(private readonly queries: QueryBus) {}

  @Get()
  @Roles(UserRole.TENANT)
  @HttpCode(HttpStatus.OK)
  @ResponseCode('ISSUES_MY_FETCHED')
  @ApiOperation({
    operationId: 'getMeIssues',
    summary: 'List issues for current tenant',
  })
  @ApiPaginatedSuccessResponse({
    code: 'ISSUES_MY_FETCHED',
    dataDto: IssueReportListItemResponseDto,
  })
  async list(
    @Query() request: IssueReportListRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<IssueReportListItemResponseDto>> {
    const result = await this.queries.execute<
      IssueReportListQuery,
      PaginatedResult<IssueReportListItem>
    >(IssueReportListRequestDto.toQuery(request, actor));
    return PaginatedResponseDto.create({
      data: result.data.map(IssueReportListItemResponseDto.fromResult),
      pagination: result.pagination,
    });
  }
}
