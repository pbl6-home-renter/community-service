import { BaseRepository } from 'shared/domain/repositories/base.repository';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MessageEntity } from '../entities/message.entity';

export interface MessageRepository extends BaseRepository<MessageEntity> {
  findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<MessageEntity | null>;

  findByIdempotencyKey(
    senderMemberId: Uuid,
    clientMessageId: Uuid,
  ): Promise<MessageEntity | null>;

  nextSequenceForUpdate(
    conversationId: Uuid,
    context: TransactionContext,
  ): Promise<string>;

  latestSequenceForUpdate(
    conversationId: Uuid,
    context: TransactionContext,
  ): Promise<string>;

  countUnread(
    conversationId: Uuid,
    memberId: Uuid,
    afterSequence: string,
  ): Promise<number>;
}
