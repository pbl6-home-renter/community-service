import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { MessageSendCommand } from '../../../application/commands/message-send/message-send.command';
import { MessageType } from '../../../domain/enums/message-type.enum';

export class MessageSendRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUuid()
  @IsNotEmpty()
  conversationId: Uuid;

  @ApiProperty({ format: 'uuid' })
  @IsUuid()
  @IsNotEmpty()
  clientMessageId: Uuid;

  @ApiProperty({ enum: [MessageType.TEXT, MessageType.IMAGE] })
  @IsIn([MessageType.TEXT, MessageType.IMAGE])
  type: MessageType.TEXT | MessageType.IMAGE;

  @ApiPropertyOptional({ nullable: true, maxLength: 4000 })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  content?: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  @IsOptional()
  @IsUuid()
  mediaId?: Uuid | null;

  @ApiPropertyOptional({
    nullable: true,
    format: 'uuid',
    description: 'ID tin được trả lời (cùng hội thoại, text/image/bot).',
  })
  @IsOptional()
  @IsUuid()
  replyToMessageId?: Uuid | null;

  static toCommand(
    request: MessageSendRequestDto,
    senderUserId: Uuid,
  ): MessageSendCommand {
    return new MessageSendCommand(
      request.conversationId,
      senderUserId,
      request.clientMessageId,
      request.type,
      request.content?.trim() || null,
      request.mediaId ?? null,
      request.replyToMessageId ?? null,
    );
  }
}
