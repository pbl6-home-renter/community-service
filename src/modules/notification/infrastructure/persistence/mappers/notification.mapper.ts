import { NotificationEntity } from '../../../domain/entities/notification.entity';
import { NotificationTypeormEntity } from '../notification.typeorm-entity';

export class NotificationMapper {
  static toDomain(raw: NotificationTypeormEntity): NotificationEntity {
    return NotificationEntity.reconstitute({
      id: raw.id,
      recipientUserId: raw.recipientUserId,
      sourceService: raw.sourceService,
      eventId: raw.eventId,
      type: raw.type,
      title: raw.title,
      body: raw.body,
      deepLink: raw.deepLink,
      data: raw.data,
      readAt: raw.readAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      isDeleted: raw.isDeleted,
    });
  }

  static toPersistence(entity: NotificationEntity): NotificationTypeormEntity {
    const raw = new NotificationTypeormEntity();
    Object.assign(raw, {
      id: entity.id,
      recipientUserId: entity.recipientUserId,
      sourceService: entity.sourceService,
      eventId: entity.eventId,
      type: entity.type,
      title: entity.title,
      body: entity.body,
      deepLink: entity.deepLink,
      data: entity.data,
      readAt: entity.readAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      isDeleted: entity.isDeleted,
    });
    return raw;
  }
}
