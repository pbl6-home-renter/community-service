import { NotificationCategory } from 'modules/notification-preference/domain/enums/notification-category.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface PushMessage {
  title: string;
  body: string;
  data: Record<string, string>;
}

export interface PushRecipientMessage {
  userId: Uuid;
  message: PushMessage;
}

export interface PushDeliveryPort {
  /** Best-effort: never throws; failures are logged. */
  send(
    category: NotificationCategory,
    recipients: PushRecipientMessage[],
  ): Promise<void>;
}
