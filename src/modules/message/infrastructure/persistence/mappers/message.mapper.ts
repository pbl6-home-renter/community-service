import { MessageEntity } from '../../../domain/entities/message.entity';
import { MessageType } from '../../../domain/enums/message-type.enum';
import { MessageTypeormEntity } from '../message.typeorm-entity';

export class MessageMapper {
  static toDomain(raw: MessageTypeormEntity): MessageEntity {
    return MessageEntity.reconstitute({
      id: raw.id,
      conversationId: raw.conversationId,
      senderMemberId: raw.senderMemberId,
      senderNameSnapshot: raw.senderNameSnapshot,
      clientMessageId: raw.clientMessageId,
      type: raw.type as MessageType,
      content: raw.content,
      mediaId: raw.mediaIds[0] ?? null,
      payload: raw.payload,
      replyToMessageId: raw.replyToMessageId,
      sequence: raw.sequence,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      isDeleted: raw.isDeleted,
    });
  }

  static toPersistence(entity: MessageEntity): MessageTypeormEntity {
    const raw = new MessageTypeormEntity();
    raw.id = entity.id;
    raw.conversationId = entity.conversationId;
    raw.senderMemberId = entity.senderMemberId;
    raw.senderNameSnapshot = entity.senderNameSnapshot;
    raw.clientMessageId = entity.clientMessageId;
    raw.type = entity.type;
    raw.content = entity.content;
    raw.mediaIds = entity.mediaId ? [entity.mediaId] : [];
    raw.payload = entity.payload;
    raw.replyToMessageId = entity.replyToMessageId;
    raw.sequence = entity.sequence;
    raw.createdAt = entity.createdAt;
    raw.updatedAt = entity.updatedAt;
    raw.isDeleted = entity.isDeleted;
    return raw;
  }
}
