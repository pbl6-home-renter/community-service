import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Validate,
} from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationContextType } from 'modules/conversation/domain/enums/conversation-context-type.enum';
import { ConversationKind } from 'modules/conversation/domain/enums/conversation-kind.enum';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { ConversationListQuery } from '../../../application/queries/conversation-list/conversation-list.query';
import { ConversationListFilterValidator } from './conversation-list-filter.validator';

export class ConversationListRequestDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Validate(ConversationListFilterValidator)
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

  @ApiPropertyOptional({ enum: ConversationKind })
  @IsOptional()
  @IsEnum(ConversationKind)
  kind?: ConversationKind;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'false: chỉ chat tự do; true: chỉ chat có context.',
  })
  @IsOptional()
  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
    const value = obj[key];
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasContext?: boolean;

  @ApiPropertyOptional({
    minLength: 1,
    maxLength: 100,
    description:
      'Tìm theo title group hoặc tên người còn lại trong direct; không phân biệt hoa/thường và dấu tiếng Việt.',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.normalize('NFC').trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Chỉ dùng với kind=direct; tra cứu direct đã có tin nhắn.',
  })
  @IsOptional()
  @IsUuid()
  otherUserId?: Uuid;

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
      request.kind ?? null,
      request.hasContext ?? null,
      request.q ?? null,
      request.otherUserId ?? null,
    );
  }
}
