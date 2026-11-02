import { CursorPageQuery } from 'shared/application/pagination/cursor-page-query';
import { CursorPaginatedResult } from 'shared/application/pagination/cursor-paginated-result';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MessageType } from '../../domain/enums/message-type.enum';
import { MessagePayload } from '../../domain/types/message-payload.type';

export interface MessagePageQuery extends CursorPageQuery {
  conversationId: Uuid;
  actorUserId: Uuid;
  maxSequence: string | null;
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
  createdAt: Date;
}

export interface MessagePageQueryPort {
  findPage(
    query: MessagePageQuery,
  ): Promise<CursorPaginatedResult<MessageReadModel>>;
}
