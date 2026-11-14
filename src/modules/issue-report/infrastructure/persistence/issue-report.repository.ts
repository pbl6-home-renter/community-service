import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { Repository } from 'typeorm';
import { IssueReportEntity } from '../../domain/entities/issue-report.entity';
import { IssueReportRepository } from '../../domain/repositories/issue-report.repository';
import { IssueReportTypeormEntity } from './issue-report.typeorm-entity';
import { IssueReportMapper } from './mappers/issue-report.mapper';

@Injectable()
export class TypeOrmIssueReportRepository implements IssueReportRepository {
  constructor(
    @InjectRepository(IssueReportTypeormEntity)
    private readonly repository: Repository<IssueReportTypeormEntity>,
  ) {}

  async save(
    issue: IssueReportEntity,
    context?: TransactionContext,
  ): Promise<void> {
    await withTransaction(this.repository, context).save(
      IssueReportMapper.toPersistence(issue),
    );
  }

  async findById(id: Uuid): Promise<IssueReportEntity | null> {
    const row = await this.repository.findOne({
      where: { id, isDeleted: false },
    });
    return row ? IssueReportMapper.toDomain(row) : null;
  }

  async findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<IssueReportEntity | null> {
    const row = await withTransaction(this.repository, context).findOne({
      where: { id, isDeleted: false },
      lock: { mode: 'pessimistic_write' },
    });
    return row ? IssueReportMapper.toDomain(row) : null;
  }

  async delete(id: Uuid, context?: TransactionContext): Promise<void> {
    await withTransaction(this.repository, context).update(id, {
      isDeleted: true,
    });
  }
}
