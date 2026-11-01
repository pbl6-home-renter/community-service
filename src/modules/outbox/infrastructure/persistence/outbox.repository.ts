import { Injectable } from '@nestjs/common';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Raw, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { OutboxRepository } from '../../domain/repositories/outbox.repository';
import { OutboxMessage } from '../../domain/entities/outbox-message.entity';
import { OutboxStatus } from '../../domain/enums/outbox-status.enum';
import { OutboxTypeormEntity } from './outbox.typeorm-entity';
import { OutboxMapper } from './mappers/outbox.mapper';

@Injectable()
export class TypeOrmOutboxRepository implements OutboxRepository {
  constructor(
    @InjectRepository(OutboxTypeormEntity)
    private readonly repository: Repository<OutboxTypeormEntity>,
  ) {}

  async append(
    messages: OutboxMessage[],
    context: TransactionContext,
  ): Promise<void> {
    if (messages.length === 0) return;

    await withTransaction(this.repository, context).insert(
      messages.map(
        OutboxMapper.toPersistence,
      ) as QueryDeepPartialEntity<OutboxTypeormEntity>[],
    );
  }

  async claimBatch(limit: number): Promise<OutboxMessage[]> {
    return this.repository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(OutboxTypeormEntity);

      const candidates = await repository
        .createQueryBuilder('candidate')
        .select('candidate.id')
        .where('candidate.status = :pending', { pending: OutboxStatus.PENDING })
        .andWhere('candidate.availableAt <= NOW()')
        .andWhere((qb) => {
          const olderUnfinished = qb
            .subQuery()
            .select('1')
            .from(OutboxTypeormEntity, 'older')
            .where('older.aggregateId = candidate.aggregateId')
            .andWhere('older.sequence < candidate.sequence')
            .andWhere('older.status IN (:...blocking)')
            .getQuery();
          return `NOT EXISTS ${olderUnfinished}`;
        })
        .setParameter('blocking', [
          OutboxStatus.PENDING,
          OutboxStatus.PROCESSING,
          OutboxStatus.FAILED,
        ])
        .orderBy('candidate.sequence', 'ASC')
        .limit(limit)
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .getMany();

      const ids = candidates.map((candidate) => candidate.id);
      if (ids.length === 0) return [];

      const result = await repository
        .createQueryBuilder()
        .update()
        .set({
          status: OutboxStatus.PROCESSING,
          claimedAt: () => "date_trunc('milliseconds', NOW())",
        })
        .whereInIds(ids)
        .returning('*')
        .execute();

      return (result.raw as Record<string, unknown>[])
        .map((raw) => this.hydrate(raw))
        .sort((a, b) => (BigInt(a.sequence) < BigInt(b.sequence) ? -1 : 1))
        .map(OutboxMapper.toDomain);
    });
  }

  async saveClaimOutcome(
    message: OutboxMessage,
    claimedAt: Date,
  ): Promise<boolean> {
    const result = await this.repository.update(
      { id: message.id, status: OutboxStatus.PROCESSING, claimedAt },
      {
        status: message.status,
        retryCount: message.retryCount,
        availableAt: message.availableAt,
        claimedAt: message.claimedAt ?? null,
        processedAt: message.processedAt ?? null,
        lastError: message.lastError ?? null,
      },
    );
    return (result.affected ?? 0) > 0;
  }

  async reclaimStale(timeoutMs: number): Promise<number> {
    const result = await this.repository.update(
      {
        status: OutboxStatus.PROCESSING,
        claimedAt: Raw(
          (column) =>
            `${column} < NOW() - (:timeoutMs * INTERVAL '1 millisecond')`,
          { timeoutMs },
        ),
      },
      { status: OutboxStatus.PENDING, claimedAt: null },
    );

    return result.affected ?? 0;
  }

  async requeueFailed(id: Uuid): Promise<boolean> {
    const result = await this.repository.update(
      { id, status: OutboxStatus.FAILED },
      {
        status: OutboxStatus.PENDING,
        retryCount: 0,
        availableAt: () => 'NOW()',
        lastError: null,
      },
    );

    return (result.affected ?? 0) > 0;
  }

  async purgePublished(before: Date): Promise<number> {
    const result = await this.repository.delete({
      status: OutboxStatus.PUBLISHED,
      processedAt: LessThan(before),
    });

    return result.affected ?? 0;
  }

  private hydrate(raw: Record<string, unknown>): OutboxTypeormEntity {
    const { metadata, manager } = this.repository;

    const entity = this.repository.create();

    for (const column of metadata.columns) {
      column.setEntityValue(
        entity,
        manager.connection.driver.prepareHydratedValue(
          raw[column.databaseName],
          column,
        ),
      );
    }

    return entity;
  }
}
