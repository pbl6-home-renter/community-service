import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  TypeOrmTransactionContext,
  withTransaction,
} from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { ContractContextEventStore } from '../../application/ports/contract-context-event-store.port';
import { ContractContextChange } from '../../application/commands/contract-context-apply/contract-context-apply.command';
import { ContractContextEventTypeormEntity } from './contract-context-event.typeorm-entity';

@Injectable()
export class TypeOrmContractContextEventStore implements ContractContextEventStore {
  constructor(
    @InjectRepository(ContractContextEventTypeormEntity)
    private readonly repository: Repository<ContractContextEventTypeormEntity>,
  ) {}

  async lockContract(
    contractId: Uuid,
    context: TransactionContext,
  ): Promise<void> {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error('Contract context lock requires a TypeORM transaction');
    }
    await context.manager.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [`contract-context:${contractId}`],
    );
  }

  async save(
    event: ContractContextChange,
    contractId: Uuid,
    tenantUserId: Uuid | null,
    context: TransactionContext,
  ): Promise<void> {
    await withTransaction(this.repository, context).insert({
      eventId: event.id,
      contractId,
      tenantUserId,
      eventType: event.eventType,
      occurredAt: new Date(event.occurredAt),
      eventData: event,
      appliedAt: null,
    });
  }

  async findActivation(
    contractId: Uuid,
    context: TransactionContext,
  ): Promise<Extract<
    ContractContextChange,
    { eventType: 'contract.activated' }
  > | null> {
    const row = await withTransaction(this.repository, context).findOne({
      where: { contractId, eventType: 'contract.activated' },
    });
    return (
      (row?.eventData as
        | Extract<ContractContextChange, { eventType: 'contract.activated' }>
        | undefined) ?? null
    );
  }

  async findPending(
    contractId: Uuid,
    context: TransactionContext,
  ): Promise<ContractContextChange[]> {
    const rows = await withTransaction(this.repository, context).find({
      where: { contractId, appliedAt: IsNull() },
      order: { occurredAt: 'ASC', eventId: 'ASC' },
    });
    return rows.map((row) => row.eventData as ContractContextChange);
  }

  async hasLaterApplied(
    contractId: Uuid,
    tenantUserId: Uuid,
    occurredAt: string,
    eventId: Uuid,
    context: TransactionContext,
  ): Promise<boolean> {
    return withTransaction(this.repository, context)
      .createQueryBuilder('event')
      .where('event.contractId = :contractId', { contractId })
      .andWhere('event.appliedAt IS NOT NULL')
      .andWhere(
        "(event.tenantUserId = :tenantUserId OR (event.eventType = 'contract.activated' AND event.eventData -> 'payload' -> 'tenantUserIds' ? :tenantUserId))",
        { tenantUserId },
      )
      .andWhere(
        '(event.occurredAt > :occurredAt OR (event.occurredAt = :occurredAt AND event.eventId > :eventId))',
        { occurredAt, eventId },
      )
      .getExists();
  }

  async markApplied(eventId: Uuid, context: TransactionContext): Promise<void> {
    await withTransaction(this.repository, context).update(
      { eventId },
      { appliedAt: new Date() },
    );
  }
}
