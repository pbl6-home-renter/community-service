import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { NotificationCategory } from '../../domain/enums/notification-category.enum';
import { NotificationPreferenceRepository } from '../../domain/repositories/notification-preference.repository';
import { NOTIFICATION_PREFERENCE_DI_TOKEN } from '../../notification-preference.di-token';
import { NotificationPreferenceUpdateCommand } from './notification-preference-update.command';

@CommandHandler(NotificationPreferenceUpdateCommand)
export class NotificationPreferenceUpdateCommandHandler implements ICommandHandler<
  NotificationPreferenceUpdateCommand,
  Date
> {
  constructor(
    @Inject(NOTIFICATION_PREFERENCE_DI_TOKEN.REPOSITORY)
    private readonly preferences: NotificationPreferenceRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN) private readonly unitOfWork: IUnitOfWork,
  ) {}
  async execute(command: NotificationPreferenceUpdateCommand): Promise<Date> {
    const categories = Object.values(NotificationCategory);
    if (
      command.preferences.length !== categories.length ||
      new Set(command.preferences.map((item) => item.type)).size !==
        categories.length ||
      command.preferences.some(
        (item) =>
          !categories.includes(item.type) ||
          typeof item.pushEnabled !== 'boolean',
      )
    ) {
      throw new ValidationException(
        'Exactly one preference for chat, invoice and issue is required',
      );
    }
    const values = Object.fromEntries(
      command.preferences.map((item) => [item.type, item.pushEnabled]),
    ) as Record<NotificationCategory, boolean>;
    const at = new Date();
    await this.unitOfWork.run((context) =>
      this.preferences.replaceAll(command.userId, values, at, context),
    );
    return at;
  }
}
