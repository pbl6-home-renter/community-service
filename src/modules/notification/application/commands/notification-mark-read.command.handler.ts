import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { NotificationEntity } from '../../domain/entities/notification.entity';
import { NotificationNotFoundException } from '../../domain/exceptions/notification-not-found.exception';
import { NotificationRepository } from '../../domain/repositories/notification.repository';
import { NOTIFICATION_DI_TOKEN } from '../../notification.di-token';
import { NotificationMarkReadCommand } from './notification-mark-read.command';

@CommandHandler(NotificationMarkReadCommand)
export class NotificationMarkReadCommandHandler implements ICommandHandler<
  NotificationMarkReadCommand,
  NotificationEntity
> {
  constructor(
    @Inject(NOTIFICATION_DI_TOKEN.REPOSITORY)
    private readonly notifications: NotificationRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN) private readonly unitOfWork: IUnitOfWork,
  ) {}
  execute(command: NotificationMarkReadCommand): Promise<NotificationEntity> {
    return this.unitOfWork.run(async (context) => {
      const notification = await this.notifications.findByIdForUpdate(
        command.notificationId,
        context,
      );
      if (!notification || notification.recipientUserId !== command.userId)
        throw new NotificationNotFoundException();
      if (!notification.readAt) {
        notification.markRead(new Date());
        await this.notifications.save(notification, context);
      }
      return notification;
    });
  }
}
