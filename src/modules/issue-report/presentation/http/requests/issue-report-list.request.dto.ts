import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { IssueReportListQuery } from '../../../application/queries/issue-report-list/issue-report-list.query';
import { IssueReportListFilterRequestDto } from './issue-report-list-filter.request.dto';

export class IssueReportListRequestDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageNo = 1;
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
  @ApiPropertyOptional({ enum: ['createdAt'] })
  @IsOptional()
  @IsIn(['createdAt'])
  sort?: string;
  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
  @ApiPropertyOptional({ enum: ['json'] })
  @IsOptional()
  @IsIn(['json'])
  format?: string;
  @ApiPropertyOptional({ type: IssueReportListFilterRequestDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => IssueReportListFilterRequestDto)
  filter?: IssueReportListFilterRequestDto;

  static toQuery(
    request: IssueReportListRequestDto,
    actor: AuthenticatedUser,
  ): IssueReportListQuery {
    return new IssueReportListQuery(
      actor,
      request.pageNo,
      request.pageSize,
      request.order ?? 'asc',
      request.filter?.roomId,
      request.filter?.status,
      request.filter?.buildingId,
    );
  }
}
