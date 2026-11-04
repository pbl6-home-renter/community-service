import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsString,
  ArrayMaxSize,
  MaxLength,
  Validate,
  ValidateIf,
} from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { ConversationCreateCommand } from '../../../application/commands/conversation-create/conversation-create.command';
import { ConversationKind } from '../../../domain/enums/conversation-kind.enum';
import { ConversationTitle } from '../../../domain/value-objects/conversation-title.vo';
import { ConversationCreateShapeValidator } from './conversation-create-shape.validator';

export class ConversationCreateRequestDto {
  @ApiProperty({ enum: ConversationKind })
  @IsEnum(ConversationKind)
  @Validate(ConversationCreateShapeValidator)
  kind: ConversationKind;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Bắt buộc với kind=direct.',
  })
  @ValidateIf(
    (request: ConversationCreateRequestDto) =>
      request.recipientUserId !== undefined,
  )
  @IsUuid()
  recipientUserId?: Uuid;

  @ApiPropertyOptional({
    type: [String],
    uniqueItems: true,
    description:
      'Bắt buộc với group; ít nhất 2 user khác caller. Không cần gồm caller.',
  })
  @ValidateIf(
    (request: ConversationCreateRequestDto) =>
      request.memberUserIds !== undefined,
  )
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique((userId: string) => userId.toLowerCase())
  @IsUuid('INVALID_UUID', { each: true })
  memberUserIds?: Uuid[];

  @ApiPropertyOptional({
    maxLength: 255,
    nullable: true,
    description:
      'Chỉ dùng với group. Bỏ trống, null hoặc chỉ khoảng trắng thì server tạo tên mặc định từ thành viên ban đầu.',
  })
  @ValidateIf(
    (request: ConversationCreateRequestDto) =>
      request.title !== undefined && request.title !== null,
  )
  @IsString()
  @MaxLength(255)
  title?: string | null;

  static toCommand(
    request: ConversationCreateRequestDto,
    callerUserId: Uuid,
  ): ConversationCreateCommand {
    return new ConversationCreateCommand(
      request.kind,
      callerUserId,
      request.recipientUserId ?? null,
      request.memberUserIds ?? [],
      request.title?.trim() ? ConversationTitle.create(request.title) : null,
    );
  }
}
