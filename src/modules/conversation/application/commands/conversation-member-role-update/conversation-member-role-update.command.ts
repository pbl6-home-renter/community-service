import { ConversationMemberRole } from 'modules/conversation-member/domain/enums/conversation-member-role.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class ConversationMemberRoleUpdateCommand {
  constructor(
    readonly conversationId: Uuid,
    readonly actorUserId: Uuid,
    readonly targetUserId: Uuid,
    readonly role: ConversationMemberRole.ADMIN | ConversationMemberRole.MEMBER,
  ) {}
}
