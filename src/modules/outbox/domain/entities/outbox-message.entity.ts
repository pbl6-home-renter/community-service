import { BaseEntity } from 'shared/domain/base/base.entity';
import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';
import { OUTBOX_MAX_ERROR_LENGTH } from '../constants/outbox.constants';
import { OutboxStatus } from '../enums/outbox-status.enum';
import { InvalidOutboxStatusTransitionException } from '../exceptions/invalid-outbox-status-transition.exception';
import { RetryPolicy } from '../value-objects/retry-policy.vo';
import { OutboxMessageProps } from './outbox-message.props';

export class OutboxMessage extends BaseEntity {
  private constructor(
    id: Uuid,
    readonly aggregateType: string,
    readonly aggregateId: Uuid,
    readonly eventType: string,
    readonly routingKey: string,
    readonly payload: Record<string, unknown>,
    readonly headers: Record<string, unknown> | undefined,
    private _status: OutboxStatus,
    private _retryCount: number,
    private _availableAt: Date,
    private _claimedAt: Date | undefined,
    private _processedAt: Date | undefined,
    private _lastError: string | undefined,
    createdAt: Date,
    updatedAt: Date,
    isDeleted: boolean,
  ) {
    super(id, createdAt, updatedAt, isDeleted);
  }

  static fromDomainEvent(event: DomainEvent): OutboxMessage {
    const now = new Date();
    return new OutboxMessage(
      generateUuid(),
      event.aggregateType,
      event.aggregateId,
      event.eventType,
      event.routingKey,
      event.payload,
      { occurredAt: event.occurredAt.toISOString() },
      OutboxStatus.PENDING,
      0,
      now,
      undefined,
      undefined,
      undefined,
      now,
      now,
      false,
    );
  }

  /** Rebuilds a stored message without changing its state. */
  static reconstitute(props: OutboxMessageProps): OutboxMessage {
    return new OutboxMessage(
      props.id,
      props.aggregateType,
      props.aggregateId,
      props.eventType,
      props.routingKey,
      props.payload,
      props.headers,
      props.status,
      props.retryCount,
      props.availableAt,
      props.claimedAt,
      props.processedAt,
      props.lastError,
      props.createdAt,
      props.updatedAt,
      props.isDeleted,
    );
  }

  get status(): OutboxStatus {
    return this._status;
  }

  get retryCount(): number {
    return this._retryCount;
  }

  get availableAt(): Date {
    return this._availableAt;
  }

  get claimedAt(): Date | undefined {
    return this._claimedAt;
  }

  get processedAt(): Date | undefined {
    return this._processedAt;
  }

  get lastError(): string | undefined {
    return this._lastError;
  }

  markPublished(at: Date): void {
    this.assertCanMoveTo(OutboxStatus.PUBLISHED);
    this._status = OutboxStatus.PUBLISHED;
    this._processedAt = at;
    this._claimedAt = undefined;
    this._lastError = undefined;
  }

  markFailedAttempt(error: string, policy: RetryPolicy, at: Date): void {
    const retryCount = this._retryCount + 1;
    const nextStatus = policy.isExhausted(retryCount)
      ? OutboxStatus.FAILED
      : OutboxStatus.PENDING;
    this.assertCanMoveTo(nextStatus);
    this._retryCount = retryCount;
    this._status = nextStatus;
    this._availableAt = new Date(
      at.getTime() + policy.delayFor(this._retryCount),
    );
    this._claimedAt = undefined;
    this._lastError = error.slice(0, OUTBOX_MAX_ERROR_LENGTH);
  }

  /** Every transition out of a claim starts from PROCESSING. */
  private assertCanMoveTo(nextStatus: OutboxStatus): void {
    if (this._status !== OutboxStatus.PROCESSING) {
      throw new InvalidOutboxStatusTransitionException(
        this.id,
        this._status,
        nextStatus,
      );
    }
  }
}
