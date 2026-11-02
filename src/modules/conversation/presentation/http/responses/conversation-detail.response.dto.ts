import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationDetailQueryResult } from 'modules/conversation/application/ports/conversation-detail-query.port';
import { ConversationContextType } from 'modules/conversation/domain/enums/conversation-context-type.enum';
import { ConversationKind } from 'modules/conversation/domain/enums/conversation-kind.enum';
import { ConversationMemberResponseDto } from './conversation-member.response.dto';

export class ConversationDetailResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: Uuid;

  @ApiProperty({ enum: ConversationKind })
  kind: ConversationKind;

  @ApiProperty({ enum: ['contract', 'building'], nullable: true })
  contextType: ConversationContextType | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  contextId: Uuid | null;

  @ApiProperty({ maxLength: 255, nullable: true })
  title: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  avatarMediaId: Uuid | null;

  @ApiProperty({ minimum: 0 })
  unreadCount: number;

  @ApiProperty({ type: [ConversationMemberResponseDto] })
  members: ConversationMemberResponseDto[];

  static fromResult(
    result: Pick<
      ConversationDetailQueryResult,
      'conversation' | 'members' | 'unreadCount'
    >,
  ): ConversationDetailResponseDto {
    const response = new ConversationDetailResponseDto();
    response.id = result.conversation.id;
    response.kind = result.conversation.kind;
    response.contextType = result.conversation.contextType;
    response.contextId = result.conversation.contextId;
    response.title = result.conversation.title?.value ?? null;
    response.avatarMediaId = result.conversation.avatarMediaId;
    response.unreadCount = result.unreadCount;
    response.members = result.members.map(
      ConversationMemberResponseDto.fromDomain,
    );
    return response;
  }
}
