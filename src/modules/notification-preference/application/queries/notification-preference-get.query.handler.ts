import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotificationCategory } from '../../domain/enums/notification-category.enum';
import { NotificationPreferenceRepository } from '../../domain/repositories/notification-preference.repository';
import { NOTIFICATION_PREFERENCE_DI_TOKEN } from '../../notification-preference.di-token';
import { NotificationPreferenceValue } from '../ports/notification-preference-value';
import { NotificationPreferenceGetQuery } from './notification-preference-get.query';

@QueryHandler(NotificationPreferenceGetQuery)
export class NotificationPreferenceGetQueryHandler implements IQueryHandler<
  NotificationPreferenceGetQuery,
  NotificationPreferenceValue[]
> {
  constructor(
    @Inject(NOTIFICATION_PREFERENCE_DI_TOKEN.REPOSITORY)
    private readonly preferences: NotificationPreferenceRepository,
  ) {}
  async execute(
    query: NotificationPreferenceGetQuery,
  ): Promise<NotificationPreferenceValue[]> {
    const saved = await this.preferences.findByUserId(query.userId);
    const byCategory = new Map(
      saved.map((item) => [item.category, item.pushEnabled]),
    );
    return Object.values(NotificationCategory).map((type) => ({
      type,
      pushEnabled: byCategory.get(type) ?? true,
    }));
  }
}
