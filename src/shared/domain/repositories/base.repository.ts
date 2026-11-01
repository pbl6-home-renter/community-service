import { BaseEntity } from '../base/base.entity';
import { Uuid } from '../value-objects/uuid.vo';
import { TransactionContext } from './transaction-context';

/**
 * Minimal contract of an aggregate repository. Queries beyond lookup by id
 * (pagination, filters) are declared on the aggregate's own repository.
 */
export interface BaseRepository<T extends BaseEntity> {
  save(entity: T, context?: TransactionContext): Promise<void>;

  findById(id: Uuid): Promise<T | null>;

  delete(id: Uuid, context?: TransactionContext): Promise<void>;
}
