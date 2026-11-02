import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class ConversationMembersAddCommand {
  constructor(
    readonly conversationId: Uuid,
    readonly callerUserId: Uuid,
    readonly userIds: Uuid[],
  ) {}
}
