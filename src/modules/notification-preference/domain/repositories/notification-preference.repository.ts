import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { NotificationCategory } from '../enums/notification-category.enum';
import { NotificationPreferenceEntity } from '../entities/notification-preference.entity';

export interface NotificationPreferenceRepository {
  findByUserId(userId: Uuid): Promise<NotificationPreferenceEntity[]>;
  replaceAll(
    userId: Uuid,
    values: Record<NotificationCategory, boolean>,
    at: Date,
    context: TransactionContext,
  ): Promise<void>;
}
