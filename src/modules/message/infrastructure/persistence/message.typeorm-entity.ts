import { Check, Column, Entity, ForeignKey, Index } from 'typeorm';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { AbstractEntity } from 'shared/infrastructure/database/abstract.typeorm-entity';
import { MessageType } from '../../domain/enums/message-type.enum';

@Entity('messages')
@ForeignKey('conversations', ['conversationId'], ['id'], {
  name: 'FK_messages_conversation_id',
  onDelete: 'RESTRICT',
})
@ForeignKey('conversation_members', ['senderMemberId'], ['id'], {
  name: 'FK_messages_sender_member_id',
  onDelete: 'RESTRICT',
})
@Index('UQ_messages_conversation_sequence', ['conversationId', 'sequence'], {
  unique: true,
})
@Index('UQ_messages_sender_client_id', ['senderMemberId', 'clientMessageId'], {
  unique: true,
  where: '"client_message_id" IS NOT NULL',
})
@Index('IDX_messages_conversation_created_at', ['conversationId', 'sequence'])
@Check('CHK_messages_sequence_positive', 'sequence > 0')
@Check(
  'CHK_messages_type',
  "message_type IN ('text', 'image', 'system', 'bot')",
)
export class MessageTypeormEntity extends AbstractEntity {
  @Column({ type: 'uuid' })
  conversationId: Uuid;

  @Column({ type: 'uuid' })
  senderMemberId: Uuid;

  @Column({ type: 'uuid', nullable: true })
  clientMessageId: Uuid | null;

  @Column({ type: 'varchar', length: 20 })
  type: MessageType;

  @Column({ type: 'varchar', length: 4000, nullable: true })
  content: string | null;

  @Column({ type: 'uuid', nullable: true })
  mediaId: Uuid | null;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ type: 'bigint' })
  sequence: string;
}
