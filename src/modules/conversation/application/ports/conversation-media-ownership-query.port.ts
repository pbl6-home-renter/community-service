import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface ConversationMediaOwnershipResult {
  landlordId: null;
  participantUserIds: Uuid[];
  status: null;
}

export interface ConversationMediaOwnershipQueryPort {
  findForUser(
    conversationId: Uuid,
    actorUserId: Uuid,
    mediaId?: Uuid,
  ): Promise<ConversationMediaOwnershipResult | null>;
}
