import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { Uuid, isValidUuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationAvatarChangedMessagePayloadData } from '../types/message-payload.type';

export class ConversationAvatarChangedMessagePayload {
  private constructor(
    readonly actorUserId: Uuid,
    readonly oldAvatarMediaId: Uuid | null,
    readonly newAvatarMediaId: Uuid | null,
  ) {}

  static create(
    actorUserId: Uuid,
    oldAvatarMediaId: Uuid | null,
    newAvatarMediaId: Uuid | null,
  ): ConversationAvatarChangedMessagePayload {
    if (
      !isValidUuid(actorUserId) ||
      (oldAvatarMediaId !== null && !isValidUuid(oldAvatarMediaId)) ||
      (newAvatarMediaId !== null && !isValidUuid(newAvatarMediaId))
    ) {
      throw new ValidationException('Conversation avatar change is invalid');
    }
    return new ConversationAvatarChangedMessagePayload(
      actorUserId,
      oldAvatarMediaId,
      newAvatarMediaId,
    );
  }

  toJSON(): ConversationAvatarChangedMessagePayloadData {
    return {
      action: 'conversation_avatar_changed',
      actorUserId: this.actorUserId,
      oldAvatarMediaId: this.oldAvatarMediaId,
      newAvatarMediaId: this.newAvatarMediaId,
    };
  }
}
