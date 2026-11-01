import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SampleRepository } from '../../domain/repositories/sample.repository';
import { SampleEntity } from '../../domain/entities/sample.entity';
import { SampleTypeormEntity } from './sample.typeorm-entity';
import { SampleMapper } from './mappers/sample.mapper';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';

@Injectable()
export class TypeOrmSampleRepository implements SampleRepository {
  constructor(
    @InjectRepository(SampleTypeormEntity)
    private readonly repository: Repository<SampleTypeormEntity>,
  ) {}

  async save(
    sample: SampleEntity,
    context?: TransactionContext,
  ): Promise<void> {
    const raw = SampleMapper.toPersistence(sample);
    await withTransaction(this.repository, context).save(raw);
  }

  async findById(id: Uuid): Promise<SampleEntity | null> {
    const raw = await this.repository.findOne({
      where: { id, isDeleted: false },
    });
    if (!raw) {
      return null;
    }
    return SampleMapper.toDomain(raw);
  }

  async findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<SampleEntity | null> {
    const raw = await withTransaction(this.repository, context).findOne({
      where: { id, isDeleted: false },
      lock: { mode: 'pessimistic_write' },
    });
    return raw ? SampleMapper.toDomain(raw) : null;
  }

  async delete(id: Uuid, context?: TransactionContext): Promise<void> {
    await withTransaction(this.repository, context).update(id, {
      isDeleted: true,
    });
  }
}
