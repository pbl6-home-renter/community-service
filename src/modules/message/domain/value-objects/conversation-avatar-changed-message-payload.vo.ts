import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { Uuid, isValidUuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationAvatarChangedMessagePayloadData } from '../types/message-payload.type';
import { isValidSystemMessageActorName } from '../validation/system-message-actor.validation';

export class ConversationAvatarChangedMessagePayload {
  private constructor(
    readonly actorUserId: Uuid,
    readonly actorDisplayName: string,
    readonly oldAvatarMediaId: Uuid | null,
    readonly newAvatarMediaId: Uuid | null,
  ) {}

  static create(
    actorUserId: Uuid,
    actorDisplayName: string,
    oldAvatarMediaId: Uuid | null,
    newAvatarMediaId: Uuid | null,
  ): ConversationAvatarChangedMessagePayload {
    if (
      !isValidUuid(actorUserId) ||
      !isValidSystemMessageActorName(actorDisplayName) ||
      (oldAvatarMediaId !== null && !isValidUuid(oldAvatarMediaId)) ||
      (newAvatarMediaId !== null && !isValidUuid(newAvatarMediaId))
    ) {
      throw new ValidationException('Conversation avatar change is invalid');
    }
    return new ConversationAvatarChangedMessagePayload(
      actorUserId,
      actorDisplayName,
      oldAvatarMediaId,
      newAvatarMediaId,
    );
  }

  toJSON(): ConversationAvatarChangedMessagePayloadData {
    return {
      action: 'conversation_avatar_changed',
      actorUserId: this.actorUserId,
      actorDisplayName: this.actorDisplayName,
      oldAvatarMediaId: this.oldAvatarMediaId,
      newAvatarMediaId: this.newAvatarMediaId,
    };
  }
}
