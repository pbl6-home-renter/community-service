import { NotificationEntity } from '../../domain/entities/notification.entity';

export interface NotificationDeliveryPort {
  /** Best-effort socket + push delivery; never throws. */
  deliver(notifications: NotificationEntity[]): Promise<void>;
}
