import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MessageType } from 'modules/message/domain/enums/message-type.enum';
import { MessagePayload } from 'modules/message/domain/types/message-payload.type';
import { ConversationLastMessageReadModel } from '../../../application/ports/conversation-page-query.port';

export class ConversationLastMessageResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: Uuid;

  @ApiProperty({ type: String, pattern: '^[1-9]\\d*$', example: '42' })
  sequence: string;

  @ApiProperty({ maxLength: 254 })
  senderName: string;

  @ApiProperty({ maxLength: 120 })
  contentPreview: string;

  @ApiProperty({ enum: MessageType })
  type: MessageType;

  @ApiProperty({ type: Object, nullable: true })
  payload: MessagePayload | null;

  @ApiProperty({ format: 'date-time' })
  sentAt: Date;

  static fromReadModel(
    message: ConversationLastMessageReadModel,
  ): ConversationLastMessageResponseDto {
    const response = new ConversationLastMessageResponseDto();
    response.id = message.id;
    response.sequence = message.sequence;
    response.senderName = message.senderNameSnapshot;
    response.contentPreview = ConversationLastMessageResponseDto.preview(
      message.content ?? '',
    );
    response.type = message.type;
    response.payload = message.payload;
    response.sentAt = message.sentAt;
    return response;
  }

  private static preview(content: string): string {
    if (content.length <= 120) return content;
    return `${content.slice(0, 117)}...`;
  }
}
