import { Uuid } from '../value-objects/uuid.vo';

export interface DomainEvent {
  readonly eventType: string;
  readonly routingKey: string;
  readonly aggregateType: string;
  readonly aggregateId: Uuid;
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;
}
