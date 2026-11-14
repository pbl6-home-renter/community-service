import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IssueReportEntity } from '../../../domain/entities/issue-report.entity';
import { IssueStatus } from '../../../domain/enums/issue-status.enum';

export class IssueReportCreateResponseDto {
  @ApiProperty({ format: 'uuid' }) id: Uuid;
  @ApiProperty({ enum: IssueStatus }) status: IssueStatus;
  @ApiProperty() title: string;

  static fromDomain(issue: IssueReportEntity): IssueReportCreateResponseDto {
    return Object.assign(new IssueReportCreateResponseDto(), {
      id: issue.id,
      status: issue.status,
      title: issue.title,
    });
  }
}
