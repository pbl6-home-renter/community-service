import { BaseRepository } from 'shared/domain/repositories/base.repository';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationMemberEntity } from '../entities/conversation-member.entity';
import { ConversationMemberIdentity } from '../entities/conversation-member.props';

export interface ConversationMemberRepository extends BaseRepository<ConversationMemberEntity> {
  findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<ConversationMemberEntity | null>;

  findByParticipantForUpdate(
    conversationId: Uuid,
    participant: ConversationMemberIdentity,
    context: TransactionContext,
  ): Promise<ConversationMemberEntity | null>;
}
