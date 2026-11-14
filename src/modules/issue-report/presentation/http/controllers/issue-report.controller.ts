import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ApiPaginatedSuccessResponse } from 'shared/presentation/decorators/api-paginated-success-response.decorator';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { PaginatedResponseDto } from 'shared/presentation/pagination/paginated.response.dto';
import { IssueReportCancelCommand } from '../../../application/commands/issue-report-cancel/issue-report-cancel.command';
import { IssueReportCreateCommand } from '../../../application/commands/issue-report-create/issue-report-create.command';
import { IssueReportUpdateCommand } from '../../../application/commands/issue-report-update/issue-report-update.command';
import { IssueReportDetailResult } from '../../../application/queries/issue-report-get-by-id/issue-report-get-by-id.query.handler';
import { IssueReportGetByIdQuery } from '../../../application/queries/issue-report-get-by-id/issue-report-get-by-id.query';
import { IssueReportListItem } from '../../../application/queries/issue-report-list/issue-report-list.query.handler';
import { IssueReportListQuery } from '../../../application/queries/issue-report-list/issue-report-list.query';
import { IssueReportEntity } from '../../../domain/entities/issue-report.entity';
import { IssueReportCreateRequestDto } from '../requests/issue-report-create.request.dto';
import { IssueReportListRequestDto } from '../requests/issue-report-list.request.dto';
import { IssueReportUpdateRequestDto } from '../requests/issue-report-update.request.dto';
import { IssueReportActionResponseDto } from '../responses/issue-report-action.response.dto';
import { IssueReportCreateResponseDto } from '../responses/issue-report-create.response.dto';
import { IssueReportDetailResponseDto } from '../responses/issue-report-detail.response.dto';
import { IssueReportListItemResponseDto } from '../responses/issue-report-list-item.response.dto';

@ApiTags('IssueReport')
@ApiBearerAuth()
@Controller('issues')
export class IssueReportController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @Roles(UserRole.LANDLORD)
  @HttpCode(HttpStatus.OK)
  @ResponseCode('ISSUES_FETCHED')
  @ApiOperation({ operationId: 'getIssues', summary: 'List issues' })
  @ApiPaginatedSuccessResponse({
    code: 'ISSUES_FETCHED',
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

  @Post()
  @Roles(UserRole.LANDLORD, UserRole.TENANT)
  @HttpCode(HttpStatus.CREATED)
  @ResponseCode('ISSUE_CREATED')
  @ApiOperation({ operationId: 'postIssues', summary: 'Report issue' })
  @ApiSuccessResponse({
    status: HttpStatus.CREATED,
    code: 'ISSUE_CREATED',
    dataDto: IssueReportCreateResponseDto,
  })
  async create(
    @Body() request: IssueReportCreateRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<IssueReportCreateResponseDto> {
    const issue = await this.commands.execute<
      IssueReportCreateCommand,
      IssueReportEntity
    >(IssueReportCreateRequestDto.toCommand(request, actor));
    response.setHeader('Location', `/api/v1/issues/${issue.id}`);
    return IssueReportCreateResponseDto.fromDomain(issue);
  }

  @Get(':issueId')
  @Roles(UserRole.LANDLORD, UserRole.TENANT)
  @HttpCode(HttpStatus.OK)
  @ResponseCode('ISSUE_FETCHED')
  @ApiOperation({
    operationId: 'getIssuesIssueid',
    summary: 'Get issue details',
  })
  @ApiSuccessResponse({
    code: 'ISSUE_FETCHED',
    dataDto: IssueReportDetailResponseDto,
  })
  async detail(
    @Param('issueId', ParseUUIDPipe) issueId: Uuid,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<IssueReportDetailResponseDto> {
    const result = await this.queries.execute<
      IssueReportGetByIdQuery,
      IssueReportDetailResult
    >(new IssueReportGetByIdQuery(actor, issueId));
    return IssueReportDetailResponseDto.fromDetail(result);
  }

  @Patch(':issueId')
  @Roles(UserRole.LANDLORD)
  @HttpCode(HttpStatus.OK)
  @ResponseCode('ISSUE_UPDATED')
  @ApiOperation({ operationId: 'patchIssuesIssueid', summary: 'Update issue' })
  @ApiSuccessResponse({
    code: 'ISSUE_UPDATED',
    dataDto: IssueReportActionResponseDto,
  })
  async update(
    @Param('issueId', ParseUUIDPipe) issueId: Uuid,
    @Body() request: IssueReportUpdateRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<IssueReportActionResponseDto> {
    const issue = await this.commands.execute<
      IssueReportUpdateCommand,
      IssueReportEntity
    >(IssueReportUpdateRequestDto.toCommand(request, actor, issueId));
    return IssueReportActionResponseDto.fromDomain(issue);
  }

  @Post(':issueId/cancel')
  @Roles(UserRole.LANDLORD, UserRole.TENANT)
  @HttpCode(HttpStatus.OK)
  @ResponseCode('ISSUE_CANCELLED')
  @ApiOperation({
    operationId: 'postIssuesIssueidCancel',
    summary: 'Cancel issue',
  })
  @ApiSuccessResponse({
    code: 'ISSUE_CANCELLED',
    dataDto: IssueReportActionResponseDto,
  })
  async cancel(
    @Param('issueId', ParseUUIDPipe) issueId: Uuid,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<IssueReportActionResponseDto> {
    const issue = await this.commands.execute<
      IssueReportCancelCommand,
      IssueReportEntity
    >(new IssueReportCancelCommand(actor, issueId));
    return IssueReportActionResponseDto.fromDomain(issue);
  }
}
