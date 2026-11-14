import { BaseRepository } from 'shared/domain/repositories/base.repository';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IssueReportEntity } from '../entities/issue-report.entity';

export interface IssueReportRepository extends BaseRepository<IssueReportEntity> {
  findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<IssueReportEntity | null>;
}
