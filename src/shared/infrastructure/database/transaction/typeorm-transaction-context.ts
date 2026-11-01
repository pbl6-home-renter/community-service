import { EntityManager, ObjectLiteral, Repository } from 'typeorm';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';

export class TypeOrmTransactionContext implements TransactionContext {
  readonly kind = 'transaction' as const;

  constructor(readonly manager: EntityManager) {}
}

export function withTransaction<T extends ObjectLiteral>(
  repository: Repository<T>,
  context?: TransactionContext,
): Repository<T> {
  return context instanceof TypeOrmTransactionContext
    ? context.manager.withRepository(repository)
    : repository;
}
