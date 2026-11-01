import { DomainEvent } from 'shared/domain/base/domain-event';
import {
  SAMPLE_AGGREGATE_TYPE,
  SAMPLE_EVENTS,
} from '../constants/sample-event.constants';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class SampleCreatedEvent implements DomainEvent {
  readonly eventType = SAMPLE_EVENTS.CREATED;
  readonly routingKey = SAMPLE_EVENTS.CREATED;
  readonly aggregateType = SAMPLE_AGGREGATE_TYPE;
  readonly occurredAt = new Date();

  constructor(
    readonly aggregateId: Uuid,
    readonly title: string,
    readonly description?: string,
  ) {}

  get payload(): Record<string, unknown> {
    return {
      id: this.aggregateId,
      title: this.title,
      description: this.description,
    };
  }
}
