import { BaseRepository } from 'shared/domain/repositories/base.repository';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationEntity } from '../entities/conversation.entity';
import { ConversationContextType } from '../enums/conversation-context-type.enum';

export interface ConversationRepository extends BaseRepository<ConversationEntity> {
  findByContextForUpdate(
    contextType: ConversationContextType,
    contextId: Uuid,
    context: TransactionContext,
  ): Promise<ConversationEntity | null>;
  findByDirectPairKeyForUpdate(
    directPairKey: string,
    context: TransactionContext,
  ): Promise<ConversationEntity | null>;

  findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<ConversationEntity | null>;
}
