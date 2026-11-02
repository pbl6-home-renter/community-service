import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min, Validate } from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationContextType } from 'modules/conversation/domain/enums/conversation-context-type.enum';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { ConversationListQuery } from '../../../application/queries/conversation-list/conversation-list.query';
import { ConversationListContextValidator } from './conversation-list-context.validator';

export class ConversationListRequestDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Validate(ConversationListContextValidator)
  pageNo = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @ApiPropertyOptional({ enum: ConversationContextType })
  @IsOptional()
  @IsEnum(ConversationContextType)
  contextType?: ConversationContextType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUuid()
  contextId?: Uuid;

  static toQuery(
    request: ConversationListRequestDto,
    userId: Uuid,
  ): ConversationListQuery {
    return new ConversationListQuery(
      userId,
      request.pageNo,
      request.pageSize,
      request.contextType ?? null,
      request.contextId ?? null,
    );
  }
}
