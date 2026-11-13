import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MessageType } from '../../../domain/enums/message-type.enum';

export class MessageSendCommand {
  constructor(
    readonly conversationId: Uuid,
    readonly senderUserId: Uuid,
    readonly clientMessageId: Uuid,
    readonly type: MessageType.TEXT | MessageType.IMAGE | MessageType.VIDEO | MessageType.FILE,
    readonly content: string | null,
    readonly mediaId: Uuid | null,
    readonly replyToMessageId: Uuid | null = null,
  ) {}
}
