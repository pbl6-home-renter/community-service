import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface IntegrationEvent<TPayload = Record<string, unknown>> {
  readonly id: Uuid;
  readonly eventType: string;
  readonly routingKey: string;
  readonly aggregateType: string;
  readonly aggregateId: Uuid;
  readonly payload: TPayload;
  readonly headers?: Record<string, unknown>;
  readonly occurredAt: string;
}
