import { Column, Entity, Generated, Index } from 'typeorm';
import { AbstractEntity } from 'shared/infrastructure/database/abstract.typeorm-entity';
import { OutboxStatus } from '../../domain/enums/outbox-status.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

@Entity('outbox_messages')
@Index('IDX_outbox_status_available', ['status', 'availableAt'])
@Index('IDX_outbox_aggregate_sequence', ['aggregateId', 'sequence'])
@Index('IDX_outbox_status_processed', ['status', 'processedAt'])
export class OutboxTypeormEntity extends AbstractEntity {
  @Generated('increment')
  @Column({ type: 'bigint', update: false })
  sequence: string;

  @Column({ type: 'varchar', length: 100 })
  aggregateType: string;

  @Column({ type: 'uuid' })
  aggregateId: Uuid;

  @Column({ type: 'varchar', length: 150 })
  eventType: string;

  @Column({ type: 'varchar', length: 150 })
  routingKey: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  headers: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 20, default: OutboxStatus.PENDING })
  status: OutboxStatus;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  availableAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  claimedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  processedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;
}
