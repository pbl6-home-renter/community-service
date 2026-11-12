import { CursorPageQuery } from 'shared/application/pagination/cursor-page-query';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class MessageListQuery implements CursorPageQuery {
  constructor(
    readonly conversationId: Uuid,
    readonly actorUserId: Uuid,
    readonly cursor: string | undefined,
    readonly pageSize: number,
    /** Optional inclusive upper bound used to open a specific message. */
    readonly maxSequence: string | null = null,
  ) {}
}
