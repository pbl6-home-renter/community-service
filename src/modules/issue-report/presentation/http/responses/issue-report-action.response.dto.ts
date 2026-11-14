import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IssueReportEntity } from '../../../domain/entities/issue-report.entity';
import { IssueStatus } from '../../../domain/enums/issue-status.enum';

export class IssueReportActionResponseDto {
  @ApiProperty({ format: 'uuid' }) id: Uuid;
  @ApiProperty({ enum: IssueStatus }) status: IssueStatus;
  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  closedAt: Date | null;

  static fromDomain(issue: IssueReportEntity): IssueReportActionResponseDto {
    return Object.assign(new IssueReportActionResponseDto(), {
      id: issue.id,
      status: issue.status,
      closedAt: issue.closedAt,
    });
  }
}
