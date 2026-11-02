import { Check, Column, Entity, ForeignKey, Index } from 'typeorm';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { AbstractEntity } from 'shared/infrastructure/database/abstract.typeorm-entity';
import { ConversationMemberRole } from '../../domain/enums/conversation-member-role.enum';
import { ConversationMemberStatus } from '../../domain/enums/conversation-member-status.enum';
import { ConversationParticipantType } from '../../domain/enums/conversation-participant-type.enum';
import { ConversationTypeormEntity } from './conversation.typeorm-entity';

@Entity('conversation_members')
@ForeignKey(() => ConversationTypeormEntity, ['conversationId'], ['id'], {
  name: 'FK_conversation_members_conversation_id',
  onDelete: 'RESTRICT',
})
@Index('UQ_conversation_members_user', ['conversationId', 'userId'], {
  unique: true,
  where: '"participant_type" = \'user\' AND "user_id" IS NOT NULL',
})
@Index(
  'UQ_conversation_members_system_participant',
  ['conversationId', 'systemParticipantKey'],
  {
    unique: true,
    where:
      '"participant_type" = \'system\' AND "system_participant_key" IS NOT NULL',
  },
)
@Index('IDX_conversation_members_conversation_status', [
  'conversationId',
  'status',
])
@Check(
  'CHK_conversation_members_participant_role',
  "(participant_type = 'user' AND user_id IS NOT NULL AND system_participant_key IS NULL AND role IN ('admin', 'member')) OR (participant_type = 'system' AND user_id IS NULL AND system_participant_key IS NOT NULL AND role = 'system')",
)
@Check(
  'CHK_conversation_members_status_boundary',
  "(status = 'active' AND left_at IS NULL AND left_sequence IS NULL) OR (status = 'read_only' AND left_at IS NOT NULL AND left_sequence IS NOT NULL)",
)
@Check(
  'CHK_conversation_members_sequences_non_negative',
  'last_read_sequence >= 0 AND (left_sequence IS NULL OR left_sequence >= 0)',
)
export class ConversationMemberTypeormEntity extends AbstractEntity {
  @Column({ type: 'uuid' })
  conversationId: Uuid;

  @Column({ type: 'varchar', length: 20 })
  participantType: ConversationParticipantType;

  @Column({ type: 'uuid', nullable: true })
  userId: Uuid | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  systemParticipantKey: string | null;

  @Column({ type: 'varchar', length: 20 })
  role: ConversationMemberRole;

  @Column({
    type: 'varchar',
    length: 20,
    default: ConversationMemberStatus.ACTIVE,
  })
  status: ConversationMemberStatus;

  @Column({ type: 'timestamptz' })
  joinedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  leftAt: Date | null;

  @Column({ type: 'bigint', nullable: true })
  leftSequence: string | null;

  @Column({ type: 'bigint', default: '0' })
  lastReadSequence: string;
}
