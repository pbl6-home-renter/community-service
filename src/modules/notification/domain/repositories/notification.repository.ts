import { BaseRepository } from 'shared/domain/repositories/base.repository';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { NotificationEntity } from '../entities/notification.entity';

export interface NotificationRepository extends BaseRepository<NotificationEntity> {
  findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<NotificationEntity | null>;
  markAllRead(
    userId: Uuid,
    at: Date,
    context: TransactionContext,
  ): Promise<number>;
}
