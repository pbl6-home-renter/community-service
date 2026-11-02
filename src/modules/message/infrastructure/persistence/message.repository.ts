import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { TypeOrmTransactionContext } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { MessageEntity } from '../../domain/entities/message.entity';
import { MessageRepository } from '../../domain/repositories/message.repository';
import { MessageMapper } from './mappers/message.mapper';
import { MessageTypeormEntity } from './message.typeorm-entity';

@Injectable()
export class TypeOrmMessageRepository implements MessageRepository {
  constructor(
    @InjectRepository(MessageTypeormEntity)
    private readonly repository: Repository<MessageTypeormEntity>,
  ) {}

  async save(
    message: MessageEntity,
    context?: TransactionContext,
  ): Promise<void> {
    await withTransaction(this.repository, context).save(
      MessageMapper.toPersistence(message),
    );
  }

  async findById(id: Uuid): Promise<MessageEntity | null> {
    const raw = await this.repository.findOne({
      where: { id, isDeleted: false },
    });
    return raw ? MessageMapper.toDomain(raw) : null;
  }

  async findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<MessageEntity | null> {
    const raw = await withTransaction(this.repository, context).findOne({
      where: { id, isDeleted: false },
      lock: { mode: 'pessimistic_write' },
    });
    return raw ? MessageMapper.toDomain(raw) : null;
  }

  async findByIdempotencyKey(
    senderMemberId: Uuid,
    clientMessageId: Uuid,
  ): Promise<MessageEntity | null> {
    const raw = await this.repository.findOne({
      where: { senderMemberId, clientMessageId, isDeleted: false },
    });
    return raw ? MessageMapper.toDomain(raw) : null;
  }

  async nextSequenceForUpdate(
    conversationId: Uuid,
    context: TransactionContext,
  ): Promise<string> {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error(
        'Message sequence allocation requires a TypeORM transaction',
      );
    }

    const manager = context.manager;
    const conversations = (await manager.query(
      'SELECT id FROM conversations WHERE id = $1 AND is_deleted = false FOR UPDATE',
      [conversationId],
    )) as Array<{ id: Uuid }>;
    if (conversations.length === 0) {
      throw new Error(`Conversation ${conversationId} does not exist`);
    }

    const result = (await manager.query(
      'SELECT COALESCE(MAX(sequence), 0) + 1 AS sequence FROM messages WHERE conversation_id = $1',
      [conversationId],
    )) as Array<{ sequence: string }>;

    return String(result[0].sequence);
  }

  async latestSequenceForUpdate(
    conversationId: Uuid,
    context: TransactionContext,
  ): Promise<string> {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error('Message sequence lookup requires a TypeORM transaction');
    }

    const manager = context.manager;
    const conversations = (await manager.query(
      'SELECT id FROM conversations WHERE id = $1 AND is_deleted = false FOR UPDATE',
      [conversationId],
    )) as Array<{ id: Uuid }>;
    if (conversations.length === 0) {
      throw new Error(`Conversation ${conversationId} does not exist`);
    }

    const result = (await manager.query(
      'SELECT COALESCE(MAX(sequence), 0) AS sequence FROM messages WHERE conversation_id = $1',
      [conversationId],
    )) as Array<{ sequence: string }>;

    return String(result[0].sequence);
  }

  async countUnread(
    conversationId: Uuid,
    memberId: Uuid,
    afterSequence: string,
  ): Promise<number> {
    return this.repository
      .createQueryBuilder('message')
      .where('message.conversationId = :conversationId', { conversationId })
      .andWhere('message.sequence > :afterSequence', { afterSequence })
      .andWhere('message.senderMemberId != :memberId', { memberId })
      .andWhere('message.isDeleted = false')
      .getCount();
  }

  async delete(id: Uuid, context?: TransactionContext): Promise<void> {
    await withTransaction(this.repository, context).update(id, {
      isDeleted: true,
    });
  }
}
