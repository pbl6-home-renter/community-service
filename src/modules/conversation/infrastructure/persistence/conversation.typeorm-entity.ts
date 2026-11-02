import { Check, Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from 'shared/infrastructure/database/abstract.typeorm-entity';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationContextType } from '../../domain/enums/conversation-context-type.enum';
import { ConversationKind } from '../../domain/enums/conversation-kind.enum';

@Entity('conversations')
@Index('UQ_conversations_direct_pair_key', ['directPairKey'], {
  unique: true,
})
@Index('UQ_conversations_context', ['contextType', 'contextId'], {
  unique: true,
})
@Check(
  'CHK_conversations_context_type',
  "context_type IS NULL OR context_type IN ('contract', 'building')",
)
@Check(
  'CHK_conversations_context_pair',
  '(context_type IS NULL AND context_id IS NULL) OR (context_type IS NOT NULL AND context_id IS NOT NULL)',
)
@Check(
  'CHK_conversations_kind_direct_pair_key',
  "(kind = 'direct' AND direct_pair_key IS NOT NULL) OR (kind = 'group' AND direct_pair_key IS NULL)",
)
@Check(
  'CHK_conversations_title_non_empty',
  'title IS NULL OR length(btrim(title)) > 0',
)
export class ConversationTypeormEntity extends AbstractEntity {
  @Column({ type: 'varchar', length: 20 })
  kind: ConversationKind;

  @Column({ type: 'varchar', length: 20, nullable: true })
  contextType: ConversationContextType | null;

  @Column({ type: 'uuid', nullable: true })
  contextId: Uuid | null;

  @Column({ type: 'varchar', length: 73, nullable: true })
  directPairKey: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string | null;

  @Column({ type: 'uuid', nullable: true })
  avatarMediaId: Uuid | null;

  @Column({ type: 'uuid', nullable: true })
  createdByUserId: Uuid | null;
}
