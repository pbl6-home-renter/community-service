import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { Uuid, isValidUuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationTitleChangedMessagePayloadData } from '../types/message-payload.type';

export class ConversationTitleChangedMessagePayload {
  private constructor(
    readonly actorUserId: Uuid,
    readonly oldTitle: string | null,
    readonly newTitle: string | null,
  ) {}

  static create(
    actorUserId: Uuid,
    oldTitle: string | null,
    newTitle: string | null,
  ): ConversationTitleChangedMessagePayload {
    if (
      !isValidUuid(actorUserId) ||
      (oldTitle !== null &&
        (typeof oldTitle !== 'string' || oldTitle.trim().length === 0)) ||
      (newTitle !== null &&
        (typeof newTitle !== 'string' || newTitle.trim().length === 0))
    ) {
      throw new ValidationException('Conversation title change is invalid');
    }
    return new ConversationTitleChangedMessagePayload(
      actorUserId,
      oldTitle,
      newTitle,
    );
  }

  toJSON(): ConversationTitleChangedMessagePayloadData {
    return {
      action: 'conversation_title_changed',
      actorUserId: this.actorUserId,
      oldTitle: this.oldTitle,
      newTitle: this.newTitle,
    };
  }
}
