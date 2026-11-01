import { BaseRepository } from 'shared/domain/repositories/base.repository';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { SampleEntity } from '../entities/sample.entity';

export interface SampleRepository extends BaseRepository<SampleEntity> {
  findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<SampleEntity | null>;
}
