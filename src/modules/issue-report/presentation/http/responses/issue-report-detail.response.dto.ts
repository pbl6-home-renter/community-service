import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IssueReportDetailResult } from '../../../application/queries/issue-report-get-by-id/issue-report-get-by-id.query.handler';
import { IssueReportListItemResponseDto } from './issue-report-list-item.response.dto';

export class IssueReportDetailResponseDto extends IssueReportListItemResponseDto {
  @ApiProperty({ format: 'uuid' }) contractId: Uuid;
  @ApiProperty({ type: [String], format: 'uuid' }) issuePhotoMediaIds: Uuid[];
  @ApiPropertyOptional({ nullable: true }) assignedTo: string | null;
  @ApiPropertyOptional({ nullable: true }) repairCost: number | null;
  @ApiPropertyOptional({ nullable: true }) resolutionNote: string | null;
  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  closedAt: Date | null;
  @ApiProperty() canUpdate: boolean;
  @ApiProperty() canCancel: boolean;
  @ApiProperty() canUploadPhotos: boolean;

  static fromDetail(
    result: IssueReportDetailResult,
  ): IssueReportDetailResponseDto {
    return Object.assign(
      new IssueReportDetailResponseDto(),
      IssueReportListItemResponseDto.fromResult(result),
      {
        contractId: result.issue.contractId,
        issuePhotoMediaIds: result.photoIds,
        assignedTo: result.issue.assignedTo,
        repairCost: result.issue.repairCost,
        resolutionNote: result.issue.resolutionNote,
        closedAt: result.issue.closedAt,
        canUpdate: result.canUpdate,
        canCancel: result.canCancel,
        canUploadPhotos: result.canUploadPhotos,
      },
    );
  }
}
