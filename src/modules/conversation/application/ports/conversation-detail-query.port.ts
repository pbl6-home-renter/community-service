import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationEntity } from '../../domain/entities/conversation.entity';
import { ConversationMemberEntity } from 'modules/conversation-member/domain/entities/conversation-member.entity';

export interface ConversationDetailQueryResult {
  conversation: ConversationEntity;
  currentMember: ConversationMemberEntity | null;
  members: ConversationMemberEntity[];
  unreadCount: number;
}

export interface ConversationDetailQueryPort {
  findDetailForUser(
    conversationId: Uuid,
    userId: Uuid,
  ): Promise<ConversationDetailQueryResult | null>;
}
