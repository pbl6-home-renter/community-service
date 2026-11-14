import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { IssueStatus } from '../../../domain/enums/issue-status.enum';

export class IssueReportListFilterRequestDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUuid()
  roomId?: Uuid;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUuid()
  buildingId?: Uuid;
  @ApiPropertyOptional({ enum: IssueStatus })
  @IsOptional()
  @IsEnum(IssueStatus)
  status?: IssueStatus;
}
