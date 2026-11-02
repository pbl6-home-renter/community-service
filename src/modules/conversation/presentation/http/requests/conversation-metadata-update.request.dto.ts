import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { ConversationMetadataUpdateCommand } from '../../../application/commands/conversation-metadata-update/conversation-metadata-update.command';
import { ConversationTitle } from '../../../domain/value-objects/conversation-title.vo';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';

export class ConversationMetadataUpdateRequestDto {
  @ApiPropertyOptional({
    maxLength: 255,
    nullable: true,
    description: 'Tiêu đề mới; gửi null để bỏ tiêu đề tùy chỉnh.',
  })
  @ValidateIf(
    (request: ConversationMetadataUpdateRequestDto) =>
      request.title !== undefined && request.title !== null,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @ValidateIf(
    (request: ConversationMetadataUpdateRequestDto) =>
      request.avatarMediaId !== undefined && request.avatarMediaId !== null,
  )
  @IsUuid()
  avatarMediaId?: Uuid | null;

  static toCommand(
    request: ConversationMetadataUpdateRequestDto,
    conversationId: Uuid,
    actorUserId: Uuid,
  ): ConversationMetadataUpdateCommand {
    if (request.title === undefined && request.avatarMediaId === undefined) {
      throw new ValidationException(
        'At least one conversation metadata field is required',
      );
    }
    return new ConversationMetadataUpdateCommand(
      conversationId,
      actorUserId,
      request.title === undefined
        ? undefined
        : request.title === null
          ? null
          : ConversationTitle.create(request.title),
      request.avatarMediaId,
    );
  }
}
