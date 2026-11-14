import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { IssueReportCreateCommand } from '../../../application/commands/issue-report-create/issue-report-create.command';
import { IssueCategory } from '../../../domain/enums/issue-category.enum';
import { IssueUrgency } from '../../../domain/enums/issue-urgency.enum';

export class IssueReportCreateRequestDto {
  @ApiProperty({ format: 'uuid' }) @IsUuid() roomId: Uuid;
  @ApiProperty({ maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;
  @ApiProperty({ enum: IssueCategory })
  @IsEnum(IssueCategory)
  category: IssueCategory;
  @ApiProperty({ enum: IssueUrgency })
  @IsEnum(IssueUrgency)
  urgency: IssueUrgency;
  @ApiPropertyOptional({ nullable: true, maxLength: 500 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description?: string | null;

  static toCommand(
    request: IssueReportCreateRequestDto,
    actor: AuthenticatedUser,
  ): IssueReportCreateCommand {
    return new IssueReportCreateCommand(
      actor,
      request.roomId,
      request.title,
      request.description ?? null,
      request.category,
      request.urgency,
    );
  }
}
