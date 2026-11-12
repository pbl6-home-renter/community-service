import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MessageType } from '../../../domain/enums/message-type.enum';
import { MessagePayload } from '../../../domain/types/message-payload.type';
import { MessageReadModel } from '../../../application/ports/message-page-query.port';
import { MessageReplyReferenceResponseDto } from './message-reply-reference.response.dto';

export class MessageListResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: Uuid;

  @ApiProperty({ format: 'uuid' })
  conversationId: Uuid;

  @ApiProperty({ format: 'uuid', nullable: true })
  senderUserId: Uuid | null;

  @ApiProperty({ maxLength: 254 })
  senderName: string;

  @ApiProperty({ enum: ['user', 'system'] })
  senderType: 'user' | 'system';

  @ApiProperty({ minimum: 1, format: 'int64' })
  sequence: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  clientMessageId: Uuid | null;

  @ApiProperty({ enum: MessageType })
  type: MessageType;

  @ApiProperty({ nullable: true })
  content: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  mediaId: Uuid | null;

  @ApiProperty({
    nullable: true,
    description: 'Identity media URL for display.',
  })
  mediaUrl: string | null;

  @ApiProperty({ nullable: true, type: Object })
  payload: MessagePayload | null;

  @ApiProperty({ type: MessageReplyReferenceResponseDto, nullable: true })
  replyTo: MessageReplyReferenceResponseDto | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  static fromReadModel(model: MessageReadModel): MessageListResponseDto {
    return Object.assign(new MessageListResponseDto(), model, {
      mediaId: model.mediaId,
      mediaUrl: model.mediaId ? `/api/v1/media/${model.mediaId}` : null,
      replyTo: MessageReplyReferenceResponseDto.fromDomain(model.replyTo),
    });
  }
}
