import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { TypeOrmTransactionContext } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { ConversationEntity } from '../../domain/entities/conversation.entity';
import { ConversationRepository } from '../../domain/repositories/conversation.repository';
import { ConversationMapper } from './mappers/conversation.mapper';
import { ConversationTypeormEntity } from './conversation.typeorm-entity';
import { ConversationContextType } from '../../domain/enums/conversation-context-type.enum';

@Injectable()
export class TypeOrmConversationRepository implements ConversationRepository {
  constructor(
    @InjectRepository(ConversationTypeormEntity)
    private readonly repository: Repository<ConversationTypeormEntity>,
  ) {}

  async findByContextForUpdate(
    contextType: ConversationContextType,
    contextId: Uuid,
    context: TransactionContext,
  ): Promise<ConversationEntity | null> {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error(
        'Conversation context lock requires a TypeORM transaction',
      );
    }
    await context.manager.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [`conversation-context:${contextType}:${contextId}`],
    );
    const raw = await withTransaction(this.repository, context).findOne({
      where: { contextType, contextId, isDeleted: false },
      lock: { mode: 'pessimistic_write' },
    });
    return raw ? ConversationMapper.toDomain(raw) : null;
  }

  async save(
    conversation: ConversationEntity,
    context?: TransactionContext,
  ): Promise<void> {
    await withTransaction(this.repository, context).save(
      ConversationMapper.toPersistence(conversation),
    );
  }

  async findById(id: Uuid): Promise<ConversationEntity | null> {
    const raw = await this.repository.findOne({
      where: { id, isDeleted: false },
    });
    return raw ? ConversationMapper.toDomain(raw) : null;
  }

  async findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<ConversationEntity | null> {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error('Conversation lock requires a TypeORM transaction');
    }

    const raw = await withTransaction(this.repository, context).findOne({
      where: { id, isDeleted: false },
      lock: { mode: 'pessimistic_write' },
    });
    return raw ? ConversationMapper.toDomain(raw) : null;
  }

  async findByDirectPairKeyForUpdate(
    directPairKey: string,
    context: TransactionContext,
  ): Promise<ConversationEntity | null> {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error(
        'Direct conversation lookup requires a TypeORM transaction',
      );
    }

    await context.manager.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [directPairKey],
    );
    const raw = await withTransaction(this.repository, context).findOne({
      where: { directPairKey, isDeleted: false },
      lock: { mode: 'pessimistic_write' },
    });
    return raw ? ConversationMapper.toDomain(raw) : null;
  }

  async delete(id: Uuid, context?: TransactionContext): Promise<void> {
    await withTransaction(this.repository, context).update(id, {
      isDeleted: true,
    });
  }
}
