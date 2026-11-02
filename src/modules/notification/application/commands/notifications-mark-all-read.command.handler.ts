import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { NotificationRepository } from '../../domain/repositories/notification.repository';
import { NOTIFICATION_DI_TOKEN } from '../../notification.di-token';
import { NotificationsMarkAllReadCommand } from './notifications-mark-all-read.command';

@CommandHandler(NotificationsMarkAllReadCommand)
export class NotificationsMarkAllReadCommandHandler implements ICommandHandler<
  NotificationsMarkAllReadCommand,
  number
> {
  constructor(
    @Inject(NOTIFICATION_DI_TOKEN.REPOSITORY)
    private readonly notifications: NotificationRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN) private readonly unitOfWork: IUnitOfWork,
  ) {}
  execute(command: NotificationsMarkAllReadCommand): Promise<number> {
    return this.unitOfWork.run((context) =>
      this.notifications.markAllRead(command.userId, new Date(), context),
    );
  }
}
