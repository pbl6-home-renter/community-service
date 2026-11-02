import { ConversationEntity } from '../../../domain/entities/conversation.entity';
import { ConversationTitle } from '../../../domain/value-objects/conversation-title.vo';
import { ConversationTypeormEntity } from '../conversation.typeorm-entity';

export class ConversationMapper {
  static toDomain(raw: ConversationTypeormEntity): ConversationEntity {
    return ConversationEntity.reconstitute({
      id: raw.id,
      kind: raw.kind,
      contextType: raw.contextType,
      contextId: raw.contextId,
      directPairKey: raw.directPairKey,
      title: raw.title ? ConversationTitle.create(raw.title) : null,
      avatarMediaId: raw.avatarMediaId,
      createdByUserId: raw.createdByUserId,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      isDeleted: raw.isDeleted,
    });
  }

  static toPersistence(entity: ConversationEntity): ConversationTypeormEntity {
    const raw = new ConversationTypeormEntity();
    raw.id = entity.id;
    raw.kind = entity.kind;
    raw.contextType = entity.contextType;
    raw.contextId = entity.contextId;
    raw.directPairKey = entity.directPairKey;
    raw.title = entity.title?.value ?? null;
    raw.avatarMediaId = entity.avatarMediaId;
    raw.createdByUserId = entity.createdByUserId;
    raw.createdAt = entity.createdAt;
    raw.updatedAt = entity.updatedAt;
    raw.isDeleted = entity.isDeleted;
    return raw;
  }
}
