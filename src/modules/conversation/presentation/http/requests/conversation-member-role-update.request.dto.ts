import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ConversationMemberRole } from 'modules/conversation-member/domain/enums/conversation-member-role.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationMemberRoleUpdateCommand } from '../../../application/commands/conversation-member-role-update/conversation-member-role-update.command';

export class ConversationMemberRoleUpdateRequestDto {
  @ApiProperty({
    enum: [ConversationMemberRole.ADMIN, ConversationMemberRole.MEMBER],
  })
  @IsIn([ConversationMemberRole.ADMIN, ConversationMemberRole.MEMBER])
  role: ConversationMemberRole.ADMIN | ConversationMemberRole.MEMBER;

  static toCommand(
    request: ConversationMemberRoleUpdateRequestDto,
    conversationId: Uuid,
    targetUserId: Uuid,
    actorUserId: Uuid,
  ): ConversationMemberRoleUpdateCommand {
    return new ConversationMemberRoleUpdateCommand(
      conversationId,
      actorUserId,
      targetUserId,
      request.role,
    );
  }
}
