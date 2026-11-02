import { ConversationEntity } from '../../../domain/entities/conversation.entity';
import { ConversationMemberEntity } from 'modules/conversation-member/domain/entities/conversation-member.entity';

export interface ConversationCreateResult {
  conversation: ConversationEntity;
  members: ConversationMemberEntity[];
  unreadCount: number;
  wasCreated: boolean;
}
