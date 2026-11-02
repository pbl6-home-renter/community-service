import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CursorPaginatedResult } from 'shared/application/pagination/cursor-paginated-result';
import { TypeOrmCursorPaginator } from 'shared/infrastructure/database/pagination/typeorm-cursor.paginator';
import {
  NotificationPageQuery,
  NotificationPageQueryPort,
} from '../../application/ports/notification-page-query.port';
import { NotificationEntity } from '../../domain/entities/notification.entity';
import { NotificationMapper } from '../persistence/mappers/notification.mapper';
import { NotificationTypeormEntity } from '../persistence/notification.typeorm-entity';

@Injectable()
export class TypeOrmNotificationPageQuery implements NotificationPageQueryPort {
  constructor(
    @InjectRepository(NotificationTypeormEntity)
    private readonly notifications: Repository<NotificationTypeormEntity>,
  ) {}
  async findPage(
    query: NotificationPageQuery,
  ): Promise<CursorPaginatedResult<NotificationEntity>> {
    const builder = this.notifications
      .createQueryBuilder('notification')
      .where('notification.recipientUserId = :userId', { userId: query.userId })
      .andWhere('notification.isDeleted = false');
    if (query.unreadOnly) builder.andWhere('notification.readAt IS NULL');
    return TypeOrmCursorPaginator.of(builder, query)
      .withSort('createdAt', 'desc')
      .paginate(NotificationMapper.toDomain);
  }
}
