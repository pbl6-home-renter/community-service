import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  avatarUrlOf,
  UserAvatarUrls,
} from 'modules/conversation/application/queries/user-avatar-lookup/user-avatar-lookup.query.handler';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationContextType } from 'modules/conversation/domain/enums/conversation-context-type.enum';
import { ConversationKind } from 'modules/conversation/domain/enums/conversation-kind.enum';
import { ConversationListReadModel } from '../../../application/ports/conversation-page-query.port';
import { ConversationLastMessageResponseDto } from './conversation-last-message.response.dto';

export class ConversationListResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: Uuid;

  @ApiProperty({ enum: ConversationKind })
  kind: ConversationKind;

  @ApiPropertyOptional({ enum: ConversationContextType, nullable: true })
  contextType: ConversationContextType | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  contextId: Uuid | null;

  @ApiPropertyOptional({ maxLength: 255, nullable: true })
  title: string | null;

  @ApiProperty({
    maxLength: 255,
    nullable: true,
    description:
      'Theo người xem: direct là tên snapshot của người còn lại, group là title.',
  })
  displayName: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  avatarMediaId: Uuid | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Group: URL media avatar nhóm. Direct: URL avatar của người còn lại.',
  })
  avatarUrl: string | null;

  @ApiProperty({ minimum: 0 })
  unreadCount: number;

  @ApiPropertyOptional({
    type: ConversationLastMessageResponseDto,
    nullable: true,
  })
  lastMessage: ConversationLastMessageResponseDto | null;

  static fromReadModel(
    conversation: ConversationListReadModel,
    avatars?: UserAvatarUrls,
  ): ConversationListResponseDto {
    const response = new ConversationListResponseDto();
    response.id = conversation.id;
    response.kind = conversation.kind;
    response.contextType = conversation.contextType;
    response.contextId = conversation.contextId;
    response.title = conversation.title;
    response.displayName = conversation.displayName;
    response.avatarMediaId = conversation.avatarMediaId;
    response.avatarUrl = conversation.avatarMediaId
      ? `/api/v1/media/${conversation.avatarMediaId}`
      : avatarUrlOf(avatars, conversation.otherUserId);
    response.unreadCount = conversation.unreadCount;
    response.lastMessage = conversation.lastMessage
      ? ConversationLastMessageResponseDto.fromReadModel(
          conversation.lastMessage,
        )
      : null;
    return response;
  }
}
