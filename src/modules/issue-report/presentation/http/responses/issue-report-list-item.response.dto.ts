import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IssueReportListItem } from '../../../application/queries/issue-report-list/issue-report-list.query.handler';
import { IssueCategory } from '../../../domain/enums/issue-category.enum';
import { IssueStatus } from '../../../domain/enums/issue-status.enum';
import { IssueUrgency } from '../../../domain/enums/issue-urgency.enum';

export class IssueReportListItemResponseDto {
  @ApiProperty({ format: 'uuid' }) id: Uuid;
  @ApiProperty({ format: 'uuid' }) roomId: Uuid;
  @ApiProperty({ format: 'uuid' }) buildingId: Uuid;
  @ApiProperty({ format: 'uuid' }) reporterId: Uuid;
  @ApiProperty() roomName: string;
  @ApiProperty() buildingName: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty({ enum: IssueCategory }) category: IssueCategory;
  @ApiProperty({ enum: IssueUrgency }) urgency: IssueUrgency;
  @ApiProperty({ enum: IssueStatus }) status: IssueStatus;
  @ApiProperty({ format: 'date-time' }) createdAt: Date;

  static fromResult({
    issue,
    context,
  }: IssueReportListItem): IssueReportListItemResponseDto {
    return Object.assign(new IssueReportListItemResponseDto(), {
      id: issue.id,
      roomId: issue.roomId,
      buildingId: issue.buildingId,
      reporterId: issue.creatorId,
      roomName: context.roomName,
      buildingName: context.buildingName,
      title: issue.title,
      description: issue.description,
      category: issue.category,
      urgency: issue.urgency,
      status: issue.status,
      createdAt: issue.createdAt,
    });
  }
}
