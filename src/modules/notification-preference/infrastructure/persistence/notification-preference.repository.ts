import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid, generateUuid } from 'shared/domain/value-objects/uuid.vo';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { NotificationPreferenceEntity } from '../../domain/entities/notification-preference.entity';
import { NotificationCategory } from '../../domain/enums/notification-category.enum';
import { NotificationPreferenceRepository } from '../../domain/repositories/notification-preference.repository';
import { NotificationPreferenceTypeormEntity } from './notification-preference.typeorm-entity';
import { NotificationPreferenceMapper } from './mappers/notification-preference.mapper';

@Injectable()
export class TypeOrmNotificationPreferenceRepository implements NotificationPreferenceRepository {
  constructor(
    @InjectRepository(NotificationPreferenceTypeormEntity)
    private readonly repository: Repository<NotificationPreferenceTypeormEntity>,
  ) {}
  async findByUserId(userId: Uuid): Promise<NotificationPreferenceEntity[]> {
    const records = await this.repository.find({
      where: { userId, isDeleted: false },
    });
    return records.map(NotificationPreferenceMapper.toDomain);
  }
  async findByUserIds(
    userIds: Uuid[],
    category: NotificationCategory,
  ): Promise<NotificationPreferenceEntity[]> {
    if (userIds.length === 0) return [];
    const records = await this.repository.find({
      where: { userId: In(userIds), category, isDeleted: false },
    });
    return records.map(NotificationPreferenceMapper.toDomain);
  }
  async replaceAll(
    userId: Uuid,
    values: Record<NotificationCategory, boolean>,
    at: Date,
    context: TransactionContext,
  ): Promise<void> {
    const repository = withTransaction(this.repository, context);
    await repository.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `notification-preference:${userId}`,
    ]);
    const existing = await repository.find({ where: { userId } });
    const byCategory = new Map(
      existing.map((entry) => [entry.category, entry]),
    );
    await repository.save(
      Object.values(NotificationCategory).map((category) => {
        const old = byCategory.get(category);
        return repository.create({
          id: old?.id ?? generateUuid(),
          userId,
          category,
          pushEnabled: values[category],
          createdAt: old?.createdAt ?? at,
          updatedAt: at,
          isDeleted: false,
        });
      }),
    );
  }
}
