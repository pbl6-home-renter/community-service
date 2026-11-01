import { DomainEvent } from 'shared/domain/base/domain-event';
import {
  SAMPLE_AGGREGATE_TYPE,
  SAMPLE_EVENTS,
} from '../constants/sample-event.constants';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class SampleDeletedEvent implements DomainEvent {
  readonly eventType = SAMPLE_EVENTS.DELETED;
  readonly routingKey = SAMPLE_EVENTS.DELETED;
  readonly aggregateType = SAMPLE_AGGREGATE_TYPE;
  readonly occurredAt = new Date();

  constructor(readonly aggregateId: Uuid) {}

  get payload(): Record<string, unknown> {
    return {
      id: this.aggregateId,
    };
  }
}
