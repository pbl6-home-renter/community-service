import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { NotificationEntity } from '../../domain/entities/notification.entity';
import { NotificationRepository } from '../../domain/repositories/notification.repository';
import { NotificationMapper } from './mappers/notification.mapper';
import { NotificationTypeormEntity } from './notification.typeorm-entity';

@Injectable()
export class TypeOrmNotificationRepository implements NotificationRepository {
  constructor(
    @InjectRepository(NotificationTypeormEntity)
    private readonly repository: Repository<NotificationTypeormEntity>,
  ) {}

  async save(
    entity: NotificationEntity,
    context?: TransactionContext,
  ): Promise<void> {
    await withTransaction(this.repository, context).save(
      NotificationMapper.toPersistence(entity),
    );
  }

  async findById(id: Uuid): Promise<NotificationEntity | null> {
    const raw = await this.repository.findOne({
      where: { id, isDeleted: false },
    });
    return raw ? NotificationMapper.toDomain(raw) : null;
  }

  async findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<NotificationEntity | null> {
    const raw = await withTransaction(this.repository, context).findOne({
      where: { id, isDeleted: false },
      lock: { mode: 'pessimistic_write' },
    });
    return raw ? NotificationMapper.toDomain(raw) : null;
  }

  async markAllRead(
    userId: Uuid,
    at: Date,
    context: TransactionContext,
  ): Promise<number> {
    const result = await withTransaction(this.repository, context).update(
      { recipientUserId: userId, readAt: IsNull(), isDeleted: false },
      { readAt: at },
    );
    return result.affected ?? 0;
  }

  async delete(id: Uuid, context?: TransactionContext): Promise<void> {
    await withTransaction(this.repository, context).update(id, {
      isDeleted: true,
    });
  }
}
