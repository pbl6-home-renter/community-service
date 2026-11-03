import { NotificationCategory } from 'modules/notification-preference/domain/enums/notification-category.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface PushDeliveryTarget {
  deviceId: Uuid;
  userId: Uuid;
  token: string;
}

export interface PushDeliveryTargetQueryPort {
  findEnabledTargets(
    userIds: Uuid[],
    category: NotificationCategory,
  ): Promise<PushDeliveryTarget[]>;
  revokeDevice(deviceId: Uuid, at: Date): Promise<void>;
}
