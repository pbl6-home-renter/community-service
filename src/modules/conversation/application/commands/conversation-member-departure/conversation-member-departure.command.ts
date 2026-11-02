import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export type ConversationMemberDepartureAction = 'kick' | 'leave';

export class ConversationMemberDepartureCommand {
  constructor(
    readonly conversationId: Uuid,
    readonly actorUserId: Uuid,
    readonly targetUserId: Uuid,
    readonly action: ConversationMemberDepartureAction,
  ) {}
}
