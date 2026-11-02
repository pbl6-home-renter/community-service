import { NotificationCategory } from '../../domain/enums/notification-category.enum';

export interface NotificationPreferenceValue {
  type: NotificationCategory;
  pushEnabled: boolean;
}
