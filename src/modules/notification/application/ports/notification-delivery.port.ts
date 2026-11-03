import { NotificationEntity } from '../../domain/entities/notification.entity';

export interface NotificationDeliveryPort {
  deliver(notification: NotificationEntity): Promise<void>;
}
