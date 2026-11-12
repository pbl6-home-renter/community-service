import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MessageType } from '../../../domain/enums/message-type.enum';
import { MessageSendResult } from '../../../application/commands/message-send/message-send.result';
import { MessageReplyReferenceResponseDto } from './message-reply-reference.response.dto';

export class MessageSendResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: Uuid;

  @ApiProperty({ format: 'uuid' })
  conversationId: Uuid;

  @ApiProperty({ maxLength: 254 })
  senderName: string;

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

  @ApiProperty({ minimum: 1, format: 'int64' })
  sequence: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  clientMessageId: Uuid | null;

  @ApiProperty({ type: MessageReplyReferenceResponseDto, nullable: true })
  replyTo: MessageReplyReferenceResponseDto | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  static fromResult({
    message,
    replyTo,
  }: MessageSendResult): MessageSendResponseDto {
    const response = new MessageSendResponseDto();
    response.id = message.id;
    response.conversationId = message.conversationId;
    response.senderName = message.senderNameSnapshot;
    response.type = message.type;
    response.content = message.content;
    response.mediaId = message.mediaId;
    response.mediaUrl = message.mediaId
      ? `/api/v1/media/${message.mediaId}`
      : null;
    response.sequence = message.sequence;
    response.clientMessageId = message.clientMessageId;
    response.replyTo = MessageReplyReferenceResponseDto.fromDomain(replyTo);
    response.createdAt = message.createdAt;
    return response;
  }
}
