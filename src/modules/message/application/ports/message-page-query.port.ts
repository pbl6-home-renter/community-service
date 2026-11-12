import { CursorPageQuery } from 'shared/application/pagination/cursor-page-query';
import { CursorPaginatedResult } from 'shared/application/pagination/cursor-paginated-result';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContentMessageType } from '../../domain/constants/content-message-types.constant';
import { MessageType } from '../../domain/enums/message-type.enum';
import { MessagePayload } from '../../domain/types/message-payload.type';
import { MessageReplyReference } from '../../domain/value-objects/message-reply-reference.vo';

export interface MessagePageQuery extends CursorPageQuery {
  conversationId: Uuid;
  actorUserId: Uuid;
  /** Inclusive upper bound; already capped by the read-only boundary. */
  maxSequence: string | null;
}

export interface MessageSearchPageQuery extends CursorPageQuery {
  conversationId: Uuid;
  actorUserId: Uuid;
  keyword: string;
}

export interface MessageReadModel {
  id: Uuid;
  conversationId: Uuid;
  senderUserId: Uuid | null;
  senderName: string;
  senderType: 'user' | 'system';
  sequence: string;
  clientMessageId: Uuid | null;
  type: MessageType;
  content: string | null;
  mediaId: Uuid | null;
  payload: MessagePayload | null;
  replyTo: MessageReplyReference | null;
  createdAt: Date;
}

export interface MessageSearchReadModel {
  id: Uuid;
  sequence: string;
  senderName: string;
  type: ContentMessageType;
  contentPreview: string;
  createdAt: Date;
}

export interface MessagePageQueryPort {
  findPage(
    query: MessagePageQuery,
  ): Promise<CursorPaginatedResult<MessageReadModel>>;

  /** Accent/case-insensitive content search within the caller's visible range. */
  search(
    query: MessageSearchPageQuery,
  ): Promise<CursorPaginatedResult<MessageSearchReadModel>>;
}
