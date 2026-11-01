import { Inject, Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { IntegrationEvent } from 'shared/application/messaging/integration-event';
import { InboxRepository } from 'modules/inbox/application/ports/inbox.repository';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { INBOX_DI_TOKEN } from 'modules/inbox/inbox.di-token';
import { ConsumerRegistry } from 'shared/infrastructure/messaging/rabbitmq/consumer/consumer-registry';
import { SAMPLE_EVENTS } from '../../domain/constants/sample-event.constants';
import {
  SAMPLE_CONSUMER_NAME,
  SAMPLE_CONSUMER_QUEUE,
} from './sample-consumer.constants';

@Injectable()
export class SampleSubscriber {
  private readonly logger = new Logger(SampleSubscriber.name);

  constructor(
    @Inject(INBOX_DI_TOKEN.REPOSITORY)
    private readonly inboxRepository: InboxRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  /**
   * One queue for every Sample event, consumed one message at a time, so events of a
   * sample are handled in publish order (created before deleted). Retry and DLQ are set
   * up by RabbitMqConfigService for every registered consumer.
   */
  @RabbitSubscribe({
    name: ConsumerRegistry.define({
      name: SAMPLE_CONSUMER_NAME,
      queue: SAMPLE_CONSUMER_QUEUE,
      routingKeys: [SAMPLE_EVENTS.CREATED, SAMPLE_EVENTS.DELETED],
    }),
  })
  async handle(event: IntegrationEvent): Promise<void> {
    await this.handleOnce(event, async (context) => {
      switch (event.eventType) {
        case SAMPLE_EVENTS.CREATED:
          return this.onCreated(event, context);
        case SAMPLE_EVENTS.DELETED:
          return this.onDeleted(event, context);
        default:
          this.logger.warn(`Ignoring unknown event type "${event.eventType}"`);
      }
    });
  }

  private async onCreated(
    _event: IntegrationEvent,
    _context: TransactionContext,
  ): Promise<void> {
    // Business side effects for sample.created; use _context for every write.
  }

  private async onDeleted(
    _event: IntegrationEvent,
    _context: TransactionContext,
  ): Promise<void> {
    // Business side effects for sample.deleted; use _context for every write.
  }

  /**
   * Runs `sideEffect` at most once per message id: the inbox record and the side
   * effect share one transaction, so a redelivered message is skipped. Throwing rolls
   * both back and hands the message to the retry/DLQ error handler.
   */
  private async handleOnce(
    event: IntegrationEvent,
    sideEffect: (context: TransactionContext) => Promise<void>,
  ): Promise<void> {
    await this.unitOfWork.run(async (context) => {
      const isNew = await this.inboxRepository.recordIfNew(
        event.id,
        event.eventType,
        context,
      );
      if (!isNew) return;

      await sideEffect(context);
    });
  }
}
