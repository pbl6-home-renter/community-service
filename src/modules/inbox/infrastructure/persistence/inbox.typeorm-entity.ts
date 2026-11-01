import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from 'shared/infrastructure/database/abstract.typeorm-entity';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

@Entity('processed_events')
export class InboxTypeormEntity extends AbstractEntity {
  @Index('UQ_processed_events_message_id', { unique: true })
  @Column({ type: 'uuid' })
  messageId: Uuid;

  @Column({ type: 'varchar', length: 150 })
  eventType: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  processedAt: Date;
}
