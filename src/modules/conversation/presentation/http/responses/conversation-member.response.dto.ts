import { ApiProperty } from '@nestjs/swagger';
import {
  avatarUrlOf,
  UserAvatarUrls,
} from 'modules/conversation/application/queries/user-avatar-lookup/user-avatar-lookup.query.handler';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationMemberEntity } from 'modules/conversation-member/domain/entities/conversation-member.entity';
import { ConversationMemberRole } from 'modules/conversation-member/domain/enums/conversation-member-role.enum';
import { ConversationMemberStatus } from 'modules/conversation-member/domain/enums/conversation-member-status.enum';
import { ConversationParticipantType } from 'modules/conversation-member/domain/enums/conversation-participant-type.enum';

export class ConversationMemberResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: Uuid;

  @ApiProperty({ format: 'uuid' })
  conversationId: Uuid;

  @ApiProperty({ format: 'uuid', nullable: true })
  userId: Uuid | null;

  @ApiProperty({ maxLength: 254 })
  displayName: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'URL avatar của user (Identity); null nếu chưa có hoặc là system.',
  })
  avatarUrl: string | null;

  @ApiProperty({ enum: ConversationParticipantType })
  participantType: ConversationParticipantType;

  @ApiProperty({ enum: ConversationMemberRole })
  role: ConversationMemberRole;

  @ApiProperty({ enum: ConversationMemberStatus })
  status: ConversationMemberStatus;

  @ApiProperty({ format: 'date-time' })
  joinedAt: Date;

  @ApiProperty({ format: 'date-time', nullable: true })
  leftAt: Date | null;

  @ApiProperty({ type: String, pattern: '^(0|[1-9]\\d*)$', nullable: true })
  leftSequence: string | null;

  @ApiProperty({ type: String, pattern: '^(0|[1-9]\\d*)$' })
  lastReadSequence: string;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;

  @ApiProperty()
  isDeleted: boolean;

  static fromDomain(
    member: ConversationMemberEntity,
    avatars?: UserAvatarUrls,
  ): ConversationMemberResponseDto {
    const response = new ConversationMemberResponseDto();
    response.id = member.id;
    response.conversationId = member.conversationId;
    response.userId = member.userId;
    response.displayName = member.displayName;
    response.avatarUrl = avatarUrlOf(avatars, member.userId);
    response.participantType = member.participantType;
    response.role = member.role;
    response.status = member.status;
    response.joinedAt = member.joinedAt;
    response.leftAt = member.leftAt;
    response.leftSequence = member.leftSequence;
    response.lastReadSequence = member.lastReadSequence;
    response.createdAt = member.createdAt;
    response.updatedAt = member.updatedAt;
    response.isDeleted = member.isDeleted;
    return response;
  }
}
