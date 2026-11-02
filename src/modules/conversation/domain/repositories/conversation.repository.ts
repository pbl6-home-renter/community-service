import { BaseRepository } from 'shared/domain/repositories/base.repository';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { ConversationEntity } from '../entities/conversation.entity';

export interface ConversationRepository extends BaseRepository<ConversationEntity> {
  findByDirectPairKeyForUpdate(
    directPairKey: string,
    context: TransactionContext,
  ): Promise<ConversationEntity | null>;
}
