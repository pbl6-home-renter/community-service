import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface ConversationAvatarValidatorPort {
  assertAttachable(mediaId: Uuid, conversationId: Uuid): Promise<void>;
}
