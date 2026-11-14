import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IssueReportUpdateCommand } from '../../../application/commands/issue-report-update/issue-report-update.command';
import { IssueStatus } from '../../../domain/enums/issue-status.enum';

export class IssueReportUpdateRequestDto {
  @ApiPropertyOptional({
    enum: [IssueStatus.IN_PROGRESS, IssueStatus.RESOLVED],
  })
  @ValidateIf(
    (request: IssueReportUpdateRequestDto) => request.status !== undefined,
  )
  @IsIn([IssueStatus.IN_PROGRESS, IssueStatus.RESOLVED])
  status?: IssueStatus;
  @ApiPropertyOptional({ nullable: true, maxLength: 500 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  assignedTo?: string | null;
  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: 2147483647 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  repairCost?: number | null;
  @ApiPropertyOptional({ nullable: true, maxLength: 500 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  resolutionNote?: string | null;

  static toCommand(
    request: IssueReportUpdateRequestDto,
    actor: AuthenticatedUser,
    issueId: Uuid,
  ): IssueReportUpdateCommand {
    return new IssueReportUpdateCommand(
      actor,
      issueId,
      request.status ?? undefined,
      request.assignedTo,
      request.repairCost,
      request.resolutionNote,
    );
  }
}
