import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationContextType } from '../../domain/enums/conversation-context-type.enum';
import { ConversationKind } from '../../domain/enums/conversation-kind.enum';
import { MessageType } from 'modules/message/domain/enums/message-type.enum';

export interface ConversationPageQuery {
  userId: Uuid;
  pageNo: number;
  pageSize: number;
  contextType: ConversationContextType | null;
  contextId: Uuid | null;
}

export interface ConversationLastMessageReadModel {
  id: Uuid;
  sequence: string;
  senderNameSnapshot: string;
  content: string | null;
  type: MessageType;
  sentAt: Date;
}

export interface ConversationListReadModel {
  id: Uuid;
  kind: ConversationKind;
  contextType: ConversationContextType | null;
  contextId: Uuid | null;
  title: string | null;
  avatarMediaId: Uuid | null;
  unreadCount: number;
  lastMessage: ConversationLastMessageReadModel | null;
}

export interface ConversationPageQueryPort {
  findPage(
    query: ConversationPageQuery,
  ): Promise<PaginatedResult<ConversationListReadModel>>;
}
