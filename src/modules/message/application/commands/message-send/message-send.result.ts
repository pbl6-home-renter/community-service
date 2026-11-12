import { MessageEntity } from '../../../domain/entities/message.entity';
import { MessageReplyReference } from '../../../domain/value-objects/message-reply-reference.vo';

export interface MessageSendResult {
  message: MessageEntity;
  replyTo: MessageReplyReference | null;
}
