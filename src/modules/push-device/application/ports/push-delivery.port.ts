import { NotificationCategory } from 'modules/notification-preference/domain/enums/notification-category.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface PushMessage {
  title: string;
  body: string;
  data: Record<string, string>;
}

export interface PushDeliveryPort {
  sendToUsers(
    userIds: Uuid[],
    category: NotificationCategory,
    message: PushMessage,
  ): Promise<void>;
}
