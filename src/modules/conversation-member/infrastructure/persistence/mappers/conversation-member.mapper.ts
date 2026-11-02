import { ConversationMemberEntity } from '../../../domain/entities/conversation-member.entity';
import { ConversationMemberParticipantProps } from '../../../domain/entities/conversation-member.props';
import { ConversationMemberRole } from '../../../domain/enums/conversation-member-role.enum';
import { ConversationParticipantType } from '../../../domain/enums/conversation-participant-type.enum';
import { ConversationMemberTypeormEntity } from '../conversation-member.typeorm-entity';

export class ConversationMemberMapper {
  static toDomain(
    raw: ConversationMemberTypeormEntity,
  ): ConversationMemberEntity {
    const participantProps: ConversationMemberParticipantProps =
      raw.participantType === ConversationParticipantType.USER
        ? {
            participantType: ConversationParticipantType.USER,
            userId: raw.userId!,
            role: raw.role as
              ConversationMemberRole.ADMIN | ConversationMemberRole.MEMBER,
          }
        : {
            participantType: ConversationParticipantType.SYSTEM,
            systemParticipantKey: raw.systemParticipantKey!,
            role: ConversationMemberRole.SYSTEM,
          };

    return ConversationMemberEntity.reconstitute({
      ...participantProps,
      id: raw.id,
      conversationId: raw.conversationId,
      displayName: raw.displayName,
      status: raw.status,
      joinedAt: raw.joinedAt,
      leftAt: raw.leftAt,
      leftSequence: raw.leftSequence,
      lastReadSequence: raw.lastReadSequence,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      isDeleted: raw.isDeleted,
    });
  }

  static toPersistence(
    entity: ConversationMemberEntity,
  ): ConversationMemberTypeormEntity {
    const raw = new ConversationMemberTypeormEntity();
    raw.id = entity.id;
    raw.conversationId = entity.conversationId;
    raw.participantType = entity.participantType;
    raw.userId = entity.userId;
    raw.displayName = entity.displayName;
    raw.systemParticipantKey = entity.systemParticipantKey;
    raw.role = entity.role;
    raw.status = entity.status;
    raw.joinedAt = entity.joinedAt;
    raw.leftAt = entity.leftAt;
    raw.leftSequence = entity.leftSequence;
    raw.lastReadSequence = entity.lastReadSequence;
    raw.createdAt = entity.createdAt;
    raw.updatedAt = entity.updatedAt;
    raw.isDeleted = entity.isDeleted;
    return raw;
  }
}
