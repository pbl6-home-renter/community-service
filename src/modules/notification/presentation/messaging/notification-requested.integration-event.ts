import { Uuid, isValidUuid } from 'shared/domain/value-objects/uuid.vo';
import { NotificationType } from '../../domain/enums/notification-type.enum';
import { NotificationRequestedEventInvalidException } from '../../domain/exceptions/notification-requested-event-invalid.exception';

export interface NotificationRequestedPayload {
  sourceService: string;
  recipientUserIds: Uuid[];
  notification: {
    type: NotificationType;
    title: string;
    body: string;
    deepLink?: string | null;
    data?: Record<string, unknown> | null;
  };
}

/** Locally declared peer contract; Community does not import producer code. */
export interface NotificationRequestedIntegrationEvent {
  id: Uuid;
  eventType: string;
  payload: NotificationRequestedPayload;
}

export class NotificationRequestedEventValidator {
  static assert(
    value: unknown,
  ): asserts value is NotificationRequestedIntegrationEvent {
    if (!this.isRecord(value)) {
      throw new NotificationRequestedEventInvalidException(
        'Integration event must be an object',
      );
    }
    if (typeof value.id !== 'string' || !isValidUuid(value.id)) {
      throw new NotificationRequestedEventInvalidException(
        'Integration event id must be a UUID',
      );
    }
    if (value.eventType !== 'notification.requested') {
      throw new NotificationRequestedEventInvalidException(
        'Unsupported notification integration event type',
      );
    }
    if (!this.isRecord(value.payload)) {
      throw new NotificationRequestedEventInvalidException(
        'Integration event payload must be an object',
      );
    }

    const { sourceService, recipientUserIds, notification } = value.payload;
    if (
      typeof sourceService !== 'string' ||
      !sourceService.trim() ||
      sourceService.length > 100
    ) {
      throw new NotificationRequestedEventInvalidException(
        'Notification sourceService is invalid',
      );
    }
    if (
      !Array.isArray(recipientUserIds) ||
      recipientUserIds.length === 0 ||
      recipientUserIds.some(
        (userId) => typeof userId !== 'string' || !isValidUuid(userId),
      )
    ) {
      throw new NotificationRequestedEventInvalidException(
        'Notification recipientUserIds must contain UUIDs',
      );
    }
    if (!this.isRecord(notification)) {
      throw new NotificationRequestedEventInvalidException(
        'Notification snapshot is required',
      );
    }
    if (
      !Object.values(NotificationType).includes(
        notification.type as NotificationType,
      )
    ) {
      throw new NotificationRequestedEventInvalidException(
        'Notification type is invalid',
      );
    }
    if (
      typeof notification.title !== 'string' ||
      !notification.title.trim() ||
      notification.title.length > 255
    ) {
      throw new NotificationRequestedEventInvalidException(
        'Notification title is invalid',
      );
    }
    if (
      typeof notification.body !== 'string' ||
      !notification.body.trim() ||
      notification.body.length > 2000
    ) {
      throw new NotificationRequestedEventInvalidException(
        'Notification body is invalid',
      );
    }
    if (
      notification.deepLink !== undefined &&
      notification.deepLink !== null &&
      (typeof notification.deepLink !== 'string' ||
        notification.deepLink.length > 2048)
    ) {
      throw new NotificationRequestedEventInvalidException(
        'Notification deepLink is invalid',
      );
    }
    if (
      notification.data !== undefined &&
      notification.data !== null &&
      !this.isRecord(notification.data)
    ) {
      throw new NotificationRequestedEventInvalidException(
        'Notification data must be an object',
      );
    }
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
