import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from 'shared/infrastructure/database/abstract.typeorm-entity';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

@Entity('contract_context_events')
@Index('UQ_contract_context_events_event_id', ['eventId'], { unique: true })
@Index('IDX_contract_context_events_contract_pending', [
  'contractId',
  'appliedAt',
  'occurredAt',
])
export class ContractContextEventTypeormEntity extends AbstractEntity {
  @Column({ type: 'uuid' })
  eventId: Uuid;

  @Column({ type: 'uuid' })
  contractId: Uuid;

  @Column({ type: 'uuid', nullable: true })
  tenantUserId: Uuid | null;

  @Column({ type: 'varchar', length: 100 })
  eventType: string;

  @Column({ type: 'timestamptz' })
  occurredAt: Date;

  @Column({ type: 'jsonb' })
  eventData: unknown;

  @Column({ type: 'timestamptz', nullable: true })
  appliedAt: Date | null;
}
