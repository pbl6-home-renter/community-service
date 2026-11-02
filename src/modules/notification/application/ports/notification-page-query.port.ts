import { CursorPaginatedResult } from 'shared/application/pagination/cursor-paginated-result';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { NotificationEntity } from '../../domain/entities/notification.entity';

export interface NotificationPageQuery {
  userId: Uuid;
  cursor?: string;
  pageSize: number;
  unreadOnly?: boolean;
}

export interface NotificationPageQueryPort {
  findPage(
    query: NotificationPageQuery,
  ): Promise<CursorPaginatedResult<NotificationEntity>>;
}
