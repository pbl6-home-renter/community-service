import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { OutboxStatus } from '../enums/outbox-status.enum';

/** Full state of a stored outbox message, used to reconstitute it. */
export interface OutboxMessageProps {
  id: Uuid;
  aggregateType: string;
  aggregateId: Uuid;
  eventType: string;
  routingKey: string;
  payload: Record<string, unknown>;
  headers?: Record<string, unknown>;
  status: OutboxStatus;
  retryCount: number;
  availableAt: Date;
  claimedAt?: Date;
  processedAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}
