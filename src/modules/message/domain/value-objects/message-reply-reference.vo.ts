import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  ContentMessageType,
  isContentMessageType,
} from '../constants/content-message-types.constant';
import { MessageEntity } from '../entities/message.entity';

/**
 * Quote of the original message shown on a reply, computed from the original's
 * current state. An unavailable original keeps only its id so deleted content
 * never leaks.
 */
export class MessageReplyReference {
  private constructor(
    readonly id: Uuid,
    readonly sequence: string | null,
    readonly senderName: string | null,
    readonly type: ContentMessageType | null,
    readonly contentPreview: string | null,
    readonly isUnavailable: boolean,
  ) {}

  static of(original: MessageEntity): MessageReplyReference {
    if (original.isDeleted || !isContentMessageType(original.type)) {
      return MessageReplyReference.unavailable(original.id);
    }
    return new MessageReplyReference(
      original.id,
      original.sequence,
      original.senderNameSnapshot,
      original.type,
      original.contentPreview,
      false,
    );
  }

  static unavailable(id: Uuid): MessageReplyReference {
    return new MessageReplyReference(id, null, null, null, null, true);
  }
}
