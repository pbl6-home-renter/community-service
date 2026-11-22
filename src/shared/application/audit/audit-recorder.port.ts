import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { AuditEntry } from './audit-entry';

export interface AuditRecorder {
  /** Joins the given transaction, or opens its own transaction without context. */
  record(entry: AuditEntry, context?: TransactionContext): Promise<void>;
}
