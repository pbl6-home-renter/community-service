import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface MessageMediaValidatorPort {
  assertAttachable(mediaId: Uuid, conversationId: Uuid, type: 'image' | 'video' | 'file'): Promise<void>;
}
