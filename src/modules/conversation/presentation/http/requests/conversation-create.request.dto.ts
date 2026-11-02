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
    description: 'Thành viên ban đầu của group; không cần gồm caller.',
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

  @ApiPropertyOptional({ maxLength: 255 })
  @ValidateIf(
    (request: ConversationCreateRequestDto) => request.title !== undefined,
  )
  @IsString()
  @MaxLength(255)
  title?: string;

  static toCommand(
    request: ConversationCreateRequestDto,
    callerUserId: Uuid,
  ): ConversationCreateCommand {
    return new ConversationCreateCommand(
      request.kind,
      callerUserId,
      request.recipientUserId ?? null,
      request.memberUserIds ?? [],
      request.title === undefined
        ? null
        : ConversationTitle.create(request.title),
    );
  }
}
