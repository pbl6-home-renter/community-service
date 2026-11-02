import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MessageEntity } from '../../../domain/entities/message.entity';
import { MessageType } from '../../../domain/enums/message-type.enum';

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

  @ApiProperty({ minimum: 1, format: 'int64' })
  sequence: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  clientMessageId: Uuid | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  static fromDomain(message: MessageEntity): MessageSendResponseDto {
    const response = new MessageSendResponseDto();
    response.id = message.id;
    response.conversationId = message.conversationId;
    response.senderName = message.senderNameSnapshot;
    response.type = message.type;
    response.content = message.content;
    response.mediaId = message.mediaId;
    response.sequence = message.sequence;
    response.clientMessageId = message.clientMessageId;
    response.createdAt = message.createdAt;
    return response;
  }
}
