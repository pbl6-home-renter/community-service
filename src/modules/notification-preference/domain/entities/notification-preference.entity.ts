import { BaseEntity } from 'shared/domain/base/base.entity';
import { Uuid, generateUuid } from 'shared/domain/value-objects/uuid.vo';
import { NotificationCategory } from '../enums/notification-category.enum';

export class NotificationPreferenceEntity extends BaseEntity {
  private constructor(
    id: Uuid,
    readonly userId: Uuid,
    readonly category: NotificationCategory,
    readonly pushEnabled: boolean,
    createdAt: Date,
    updatedAt: Date,
    isDeleted: boolean,
  ) {
    super(id, createdAt, updatedAt, isDeleted);
  }

  static reconstitute(props: {
    id?: Uuid;
    userId: Uuid;
    category: NotificationCategory;
    pushEnabled: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    isDeleted?: boolean;
  }): NotificationPreferenceEntity {
    return new NotificationPreferenceEntity(
      props.id ?? generateUuid(),
      props.userId,
      props.category,
      props.pushEnabled,
      props.createdAt ?? new Date(),
      props.updatedAt ?? new Date(),
      props.isDeleted ?? false,
    );
  }
}
