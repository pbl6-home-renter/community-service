import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationMarkReadCommandHandler } from './application/commands/notification-mark-read.command.handler';
import { NotificationsMarkAllReadCommandHandler } from './application/commands/notifications-mark-all-read.command.handler';
import { NotificationListQueryHandler } from './application/queries/notification-list.query.handler';
import { TypeOrmNotificationPageQuery } from './infrastructure/queries/typeorm-notification-page.query';
import { TypeOrmNotificationRepository } from './infrastructure/persistence/notification.repository';
import { NotificationTypeormEntity } from './infrastructure/persistence/notification.typeorm-entity';
import { NOTIFICATION_DI_TOKEN } from './notification.di-token';
import { NotificationController } from './presentation/http/controllers/notification.controller';

const commandHandlers = [
  NotificationMarkReadCommandHandler,
  NotificationsMarkAllReadCommandHandler,
];
const queryHandlers = [NotificationListQueryHandler];

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([NotificationTypeormEntity])],
  controllers: [NotificationController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    TypeOrmNotificationPageQuery,
    {
      provide: NOTIFICATION_DI_TOKEN.REPOSITORY,
      useClass: TypeOrmNotificationRepository,
    },
    {
      provide: NOTIFICATION_DI_TOKEN.PAGE_QUERY,
      useExisting: TypeOrmNotificationPageQuery,
    },
  ],
  exports: [NOTIFICATION_DI_TOKEN.REPOSITORY],
})
export class NotificationModule {}
