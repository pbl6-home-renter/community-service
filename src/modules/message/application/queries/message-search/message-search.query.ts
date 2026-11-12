import { CursorPageQuery } from 'shared/application/pagination/cursor-page-query';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class MessageSearchQuery implements CursorPageQuery {
  constructor(
    readonly conversationId: Uuid,
    readonly actorUserId: Uuid,
    readonly keyword: string,
    readonly cursor: string | undefined,
    readonly pageSize: number,
  ) {}
}
