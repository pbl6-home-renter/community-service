import { NotificationPreferenceEntity } from '../../../domain/entities/notification-preference.entity';
import { NotificationPreferenceTypeormEntity } from '../notification-preference.typeorm-entity';

export class NotificationPreferenceMapper {
  static toDomain(
    raw: NotificationPreferenceTypeormEntity,
  ): NotificationPreferenceEntity {
    return NotificationPreferenceEntity.reconstitute({
      id: raw.id,
      userId: raw.userId,
      category: raw.category,
      pushEnabled: raw.pushEnabled,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      isDeleted: raw.isDeleted,
    });
  }
}
