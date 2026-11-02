import { BaseEntity } from 'shared/domain/base/base.entity';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { Uuid, generateUuid } from 'shared/domain/value-objects/uuid.vo';
import { NotificationType } from '../enums/notification-type.enum';

export interface NotificationProps {
  id?: Uuid;
  recipientUserId: Uuid;
  sourceService: string;
  eventId: Uuid;
  type: NotificationType;
  title: string;
  body: string;
  deepLink?: string | null;
  data?: Record<string, unknown> | null;
  readAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  isDeleted?: boolean;
}

export class NotificationEntity extends BaseEntity {
  private _readAt: Date | null;

  private constructor(
    id: Uuid,
    readonly recipientUserId: Uuid,
    readonly sourceService: string,
    readonly eventId: Uuid,
    readonly type: NotificationType,
    readonly title: string,
    readonly body: string,
    readonly deepLink: string | null,
    readonly data: Record<string, unknown> | null,
    readAt: Date | null,
    createdAt: Date,
    updatedAt: Date,
    isDeleted: boolean,
  ) {
    super(id, createdAt, updatedAt, isDeleted);
    this._readAt = readAt;
  }

  static create(props: NotificationProps): NotificationEntity {
    if (!Object.values(NotificationType).includes(props.type))
      throw new ValidationException('Notification type is invalid');
    if (!props.sourceService.trim() || props.sourceService.length > 100)
      throw new ValidationException('Notification source is invalid');
    if (!props.title.trim() || props.title.length > 255)
      throw new ValidationException('Notification title is invalid');
    if (!props.body.trim() || props.body.length > 2000)
      throw new ValidationException('Notification body is invalid');
    if (props.deepLink && props.deepLink.length > 2048)
      throw new ValidationException('Notification deep link is invalid');
    return NotificationEntity.reconstitute(props);
  }

  static reconstitute(props: NotificationProps): NotificationEntity {
    return new NotificationEntity(
      props.id ?? generateUuid(),
      props.recipientUserId,
      props.sourceService,
      props.eventId,
      props.type,
      props.title,
      props.body,
      props.deepLink ?? null,
      props.data ?? null,
      props.readAt ?? null,
      props.createdAt ?? new Date(),
      props.updatedAt ?? new Date(),
      props.isDeleted ?? false,
    );
  }

  get readAt(): Date | null {
    return this._readAt;
  }

  markRead(at: Date): void {
    if (!this._readAt) this._readAt = at;
  }
}
