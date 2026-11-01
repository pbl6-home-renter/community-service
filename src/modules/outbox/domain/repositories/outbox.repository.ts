import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { OutboxMessage } from '../entities/outbox-message.entity';

export interface OutboxRepository {
  append(messages: OutboxMessage[], context: TransactionContext): Promise<void>;

  /** Claims PENDING messages (status → PROCESSING), at most one per aggregate. */
  claimBatch(limit: number): Promise<OutboxMessage[]>;

  /**
   * Persists the state of a message after its claim was processed, but only while the
   * row is still held by that claim. Returns false when the claim was lost (reclaimed
   * by another relay).
   */
  saveClaimOutcome(message: OutboxMessage, claimedAt: Date): Promise<boolean>;

  /** Returns PROCESSING rows whose claim is older than `timeoutMs` to PENDING. */
  reclaimStale(timeoutMs: number): Promise<number>;

  /**
   * Moves a FAILED message back to PENDING with a fresh retry budget. A FAILED message
   * blocks every later event of its aggregate, so this is how an operator unblocks it.
   */
  requeueFailed(id: Uuid): Promise<boolean>;

  purgePublished(before: Date): Promise<number>;
}
