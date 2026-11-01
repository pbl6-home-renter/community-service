import { Inject, Injectable, Logger } from '@nestjs/common';
import { MESSAGE_BROKER_DI_TOKEN } from 'shared/application/di-tokens';
import { IMessageBrokerPublisher } from 'shared/application/ports/message-broker-publisher.port';
import { IntegrationEvent } from 'shared/application/messaging/integration-event';
import { OutboxConfig } from 'shared/application/messaging/outbox.config';
import { OUTBOX_DI_TOKEN } from '../../outbox.di-token';
import { OutboxRepository } from '../../domain/repositories/outbox.repository';
import { OutboxMessage } from '../../domain/entities/outbox-message.entity';
import { RetryPolicy } from '../../domain/value-objects/retry-policy.vo';
import { OutboxStatus } from '../../domain/enums/outbox-status.enum';

const PURGE_INTERVAL_MS = 60 * 60 * 1000;

@Injectable()
export class OutboxRelayHandler {
  private readonly logger = new Logger(OutboxRelayHandler.name);
  private lastReclaimAt = 0;
  private lastPurgeAt = 0;
  private readonly retryPolicy: RetryPolicy;

  constructor(
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outboxRepository: OutboxRepository,
    @Inject(MESSAGE_BROKER_DI_TOKEN.PUBLISHER)
    private readonly publisher: IMessageBrokerPublisher,
    @Inject(OUTBOX_DI_TOKEN.CONFIG)
    private readonly config: OutboxConfig,
  ) {
    this.retryPolicy = RetryPolicy.create({
      maxAttempts: this.config.maxAttempts,
      baseDelayMs: this.config.retryBaseDelayMs,
      maxDelayMs: this.config.retryMaxDelayMs,
    });
  }

  async execute(): Promise<void> {
    const now = Date.now();

    if (now - this.lastReclaimAt >= this.config.claimTimeoutMs / 4) {
      this.lastReclaimAt = now;
      await this.outboxRepository.reclaimStale(this.config.claimTimeoutMs);
    }

    const batch = await this.outboxRepository.claimBatch(
      this.config.relayBatchSize,
    );

    await Promise.all(batch.map((message) => this.relay(message)));

    if (now - this.lastPurgeAt >= PURGE_INTERVAL_MS) {
      this.lastPurgeAt = now;
      await this.outboxRepository.purgePublished(
        new Date(now - this.config.retentionMs),
      );
    }
  }

  private async relay(message: OutboxMessage): Promise<void> {
    // claimBatch always sets claimed_at; it identifies this claim when saving.
    const claimedAt = message.claimedAt;
    if (!claimedAt) {
      this.logger.error(
        `Outbox message ${message.id} was returned without a claim`,
      );
      return;
    }

    try {
      await this.publisher.publishWithConfirm(
        this.toIntegrationEvent(message),
        {
          timeoutMs: this.config.publishTimeoutMs,
        },
      );

      message.markPublished(new Date());
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);

      this.logger.error(`Outbox message ${message.id} failed: ${reason}`);

      message.markFailedAttempt(reason, this.retryPolicy, new Date());
      if (message.status === OutboxStatus.FAILED) {
        // FAILED blocks every later event of this aggregate until it is requeued.
        this.logger.error(
          `Outbox message ${message.id} (${message.eventType}) is FAILED after ` +
            `${message.retryCount} attempts; aggregate ${message.aggregateId} is blocked. ` +
            `Fix the cause, then run: npm run outbox:requeue -- ${message.id}`,
        );
      }
    }

    try {
      const owned = await this.outboxRepository.saveClaimOutcome(
        message,
        claimedAt,
      );
      if (!owned) {
        this.logger.warn(
          `Outbox message ${message.id} was processed after its claim expired`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Outbox message ${message.id} could not be saved: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private toIntegrationEvent(message: OutboxMessage): IntegrationEvent {
    return {
      id: message.id,
      eventType: message.eventType,
      routingKey: message.routingKey,
      aggregateType: message.aggregateType,
      aggregateId: message.aggregateId,
      payload: message.payload,
      headers: message.headers,
      occurredAt: message.headers?.occurredAt
        ? String(message.headers.occurredAt)
        : message.createdAt.toISOString(),
    };
  }
}
