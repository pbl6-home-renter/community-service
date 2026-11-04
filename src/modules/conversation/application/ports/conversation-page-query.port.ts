import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationContextType } from '../../domain/enums/conversation-context-type.enum';
import { ConversationKind } from '../../domain/enums/conversation-kind.enum';
import { MessageType } from 'modules/message/domain/enums/message-type.enum';
import { MessagePayload } from 'modules/message/domain/types/message-payload.type';

export interface ConversationPageQuery {
  userId: Uuid;
  pageNo: number;
  pageSize: number;
  contextType: ConversationContextType | null;
  contextId: Uuid | null;
  kind: ConversationKind | null;
  /** false: free chats only; true: contextual chats only; null: both. */
  hasContext: boolean | null;
  /** Matches group title or the other direct member's snapshot name. */
  searchKeyword: string | null;
  /** Read-only lookup of the direct conversation with this user. */
  otherUserId: Uuid | null;
}

export interface ConversationLastMessageReadModel {
  id: Uuid;
  sequence: string;
  senderNameSnapshot: string;
  content: string | null;
  type: MessageType;
  payload: MessagePayload | null;
  sentAt: Date;
}

export interface ConversationListReadModel {
  id: Uuid;
  kind: ConversationKind;
  contextType: ConversationContextType | null;
  contextId: Uuid | null;
  title: string | null;
  /** Viewer-specific: other member's snapshot name (direct) or title (group). */
  displayName: string | null;
  avatarMediaId: Uuid | null;
  unreadCount: number;
  lastMessage: ConversationLastMessageReadModel | null;
}

export interface ConversationPageQueryPort {
  findPage(
    query: ConversationPageQuery,
  ): Promise<PaginatedResult<ConversationListReadModel>>;
}
