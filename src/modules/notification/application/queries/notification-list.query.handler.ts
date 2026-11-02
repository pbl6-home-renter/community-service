import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CursorPaginatedResult } from 'shared/application/pagination/cursor-paginated-result';
import { NotificationEntity } from '../../domain/entities/notification.entity';
import { NOTIFICATION_DI_TOKEN } from '../../notification.di-token';
import { NotificationPageQueryPort } from '../ports/notification-page-query.port';
import { NotificationListQuery } from './notification-list.query';

@QueryHandler(NotificationListQuery)
export class NotificationListQueryHandler implements IQueryHandler<
  NotificationListQuery,
  CursorPaginatedResult<NotificationEntity>
> {
  constructor(
    @Inject(NOTIFICATION_DI_TOKEN.PAGE_QUERY)
    private readonly pages: NotificationPageQueryPort,
  ) {}
  execute(
    query: NotificationListQuery,
  ): Promise<CursorPaginatedResult<NotificationEntity>> {
    return this.pages.findPage(query);
  }
}
