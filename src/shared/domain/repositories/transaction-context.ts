/**
 * Opaque handle of an open transaction. Repository ports accept it so writes of one
 * use case commit together; only the persistence layer knows what is inside.
 */
export interface TransactionContext {
  readonly kind: 'transaction';
}
