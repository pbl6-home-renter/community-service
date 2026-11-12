import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MessageType } from '../../../domain/enums/message-type.enum';
import { ContentMessageType } from '../../../domain/constants/content-message-types.constant';
import { MessageSearchReadModel } from '../../../application/ports/message-page-query.port';

export class MessageSearchResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: Uuid;

  @ApiProperty({ minimum: 1, format: 'int64' })
  sequence: string;

  @ApiProperty({ maxLength: 254 })
  senderName: string;

  @ApiProperty({ enum: [MessageType.TEXT, MessageType.IMAGE, MessageType.BOT] })
  type: ContentMessageType;

  @ApiProperty({ maxLength: 120 })
  contentPreview: string;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  static fromReadModel(
    model: MessageSearchReadModel,
  ): MessageSearchResponseDto {
    const response = new MessageSearchResponseDto();
    response.id = model.id;
    response.sequence = model.sequence;
    response.senderName = model.senderName;
    response.type = model.type;
    response.contentPreview = model.contentPreview;
    response.createdAt = model.createdAt;
    return response;
  }
}
