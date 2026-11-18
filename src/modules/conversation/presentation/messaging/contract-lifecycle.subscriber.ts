import { Inject, Injectable } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { InboxRepository } from 'modules/inbox/application/ports/inbox.repository';
import { INBOX_DI_TOKEN } from 'modules/inbox/inbox.di-token';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IntegrationEvent } from 'shared/application/messaging/integration-event';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { isValidUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConsumerRegistry } from 'shared/infrastructure/messaging/rabbitmq/consumer/consumer-registry';
import {
  CONTRACT_LIFECYCLE_CONSUMER_NAME,
  CONTRACT_LIFECYCLE_CONSUMER_QUEUE,
  CONTRACT_LIFECYCLE_EVENTS,
} from './contract-lifecycle-consumer.constants';

type ContractLifecycleIntegrationEvent = IntegrationEvent<{ id: Uuid }>;

@Injectable()
export class ContractLifecycleSubscriber {
  constructor(
    @Inject(INBOX_DI_TOKEN.REPOSITORY)
    private readonly inbox: InboxRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  @RabbitSubscribe({
    name: ConsumerRegistry.define({
      name: CONTRACT_LIFECYCLE_CONSUMER_NAME,
      queue: CONTRACT_LIFECYCLE_CONSUMER_QUEUE,
      routingKeys: Object.values(CONTRACT_LIFECYCLE_EVENTS),
    }),
  })
  async handle(event: unknown): Promise<void> {
    this.assertLifecycleEvent(event);
    // Unroutable lifecycle events block activation in the ordered Contract outbox.
    // P9-D85 reserves chat creation for activation and retains it on termination.
    await this.unitOfWork.run((context) =>
      this.inbox.recordIfNew(event.id, event.eventType, context),
    );
  }

  private assertLifecycleEvent(
    event: unknown,
  ): asserts event is ContractLifecycleIntegrationEvent {
    if (
      !this.isRecord(event) ||
      !this.isUuid(event.id) ||
      !this.isUuid(event.aggregateId) ||
      typeof event.aggregateType !== 'string' ||
      !event.aggregateType.trim() ||
      !Object.values(CONTRACT_LIFECYCLE_EVENTS).some(
        (eventType) => eventType === event.eventType,
      ) ||
      event.routingKey !== event.eventType ||
      typeof event.occurredAt !== 'string' ||
      !Number.isFinite(Date.parse(event.occurredAt)) ||
      !this.isRecord(event.payload) ||
      event.payload.id !== event.aggregateId
    ) {
      throw new ValidationException('Invalid contract lifecycle event');
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private isUuid(value: unknown): value is Uuid {
    return typeof value === 'string' && isValidUuid(value);
  }
}
