import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MessageType } from '../../../domain/enums/message-type.enum';
import { ContentMessageType } from '../../../domain/constants/content-message-types.constant';
import { MessageReplyReference } from '../../../domain/value-objects/message-reply-reference.vo';

export class MessageReplyReferenceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: Uuid;

  @ApiProperty({ type: String, nullable: true, maxLength: 254 })
  senderName: string | null;

  @ApiProperty({
    enum: [MessageType.TEXT, MessageType.IMAGE, MessageType.BOT],
    nullable: true,
  })
  type: ContentMessageType | null;

  @ApiProperty({ type: String, nullable: true, maxLength: 120 })
  contentPreview: string | null;

  @ApiProperty()
  isUnavailable: boolean;

  static fromDomain(
    reference: MessageReplyReference | null,
  ): MessageReplyReferenceResponseDto | null {
    if (!reference) return null;
    const response = new MessageReplyReferenceResponseDto();
    response.id = reference.id;
    response.senderName = reference.senderName;
    response.type = reference.type;
    response.contentPreview = reference.contentPreview;
    response.isUnavailable = reference.isUnavailable;
    return response;
  }
}
