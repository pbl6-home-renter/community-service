import { UserAvatarUrls } from 'modules/conversation/application/queries/user-avatar-lookup/user-avatar-lookup.query.handler';
import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationCreateResult } from 'modules/conversation/application/commands/conversation-create/conversation-create.result';
import { ConversationResponseCodeConstant } from '../constants/conversation-response-code.constant';
import { ConversationDetailResponseDto } from './conversation-detail.response.dto';

export class ConversationCreateResponseDto {
  @ApiProperty({ enum: [201] })
  readonly statusCode = 201;

  @ApiProperty({
    enum: [
      ConversationResponseCodeConstant.CONVERSATION_CREATED,
      ConversationResponseCodeConstant.CONVERSATION_REOPENED,
    ],
  })
  code: string;

  @ApiProperty({ type: ConversationDetailResponseDto })
  data: ConversationDetailResponseDto;

  static fromResult(
    result: ConversationCreateResult,
    viewerUserId: Uuid,
    avatars?: UserAvatarUrls,
  ): ConversationCreateResponseDto {
    const response = new ConversationCreateResponseDto();
    response.code = result.wasCreated
      ? ConversationResponseCodeConstant.CONVERSATION_CREATED
      : ConversationResponseCodeConstant.CONVERSATION_REOPENED;
    response.data = ConversationDetailResponseDto.fromResult(
      result,
      viewerUserId,
      avatars,
    );
    return response;
  }
}
