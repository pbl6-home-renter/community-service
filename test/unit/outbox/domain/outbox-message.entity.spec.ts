import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { InvalidOutboxStatusTransitionException } from 'modules/outbox/domain/exceptions/invalid-outbox-status-transition.exception';
import { OutboxStatus } from 'modules/outbox/domain/enums/outbox-status.enum';
import { RetryPolicy } from 'modules/outbox/domain/value-objects/retry-policy.vo';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

function processingMessage(retryCount = 0): OutboxMessage {
  const now = new Date('2026-11-01T00:00:00.000Z');
  return OutboxMessage.reconstitute({
    id: generateUuid(),
    aggregateType: 'Sample',
    aggregateId: generateUuid(),
    eventType: 'sample.created',
    routingKey: 'sample.created',
    payload: { id: 'sample-id' },
    status: OutboxStatus.PROCESSING,
    retryCount,
    availableAt: now,
    claimedAt: now,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  });
}

describe('RetryPolicy', () => {
  it('uses exponential backoff capped at the configured maximum', () => {
    const policy = RetryPolicy.create({
      maxAttempts: 5,
      baseDelayMs: 100,
      maxDelayMs: 250,
    });

    expect(policy.delayFor(1)).toBe(100);
    expect(policy.delayFor(2)).toBe(200);
    expect(policy.delayFor(3)).toBe(250);
  });
});

describe('OutboxMessage', () => {
  it('returns a failed delivery to pending with its next retry time', () => {
    const message = processingMessage();
    const failedAt = new Date('2026-11-01T00:00:00.000Z');
    const policy = RetryPolicy.create({
      maxAttempts: 3,
      baseDelayMs: 100,
      maxDelayMs: 500,
    });

    message.markFailedAttempt('broker unavailable', policy, failedAt);

    expect(message.status).toBe(OutboxStatus.PENDING);
    expect(message.retryCount).toBe(1);
    expect(message.availableAt).toEqual(new Date(failedAt.getTime() + 100));
    expect(message.lastError).toBe('broker unavailable');
  });

  it('marks exhausted deliveries failed and only allows transitions from processing', () => {
    const policy = RetryPolicy.create({
      maxAttempts: 1,
      baseDelayMs: 100,
      maxDelayMs: 500,
    });
    const message = processingMessage();
    message.markFailedAttempt('terminal failure', policy, new Date());

    expect(message.status).toBe(OutboxStatus.FAILED);
    expect(() => message.markPublished(new Date())).toThrow(
      InvalidOutboxStatusTransitionException,
    );
  });

  it('records publication time and clears claim metadata', () => {
    const message = processingMessage();
    const publishedAt = new Date('2026-11-02T00:00:00.000Z');
    message.markPublished(publishedAt);

    expect(message.status).toBe(OutboxStatus.PUBLISHED);
    expect(message.processedAt).toBe(publishedAt);
    expect(message.claimedAt).toBeUndefined();
  });
});
