import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class NotificationMarkReadCommand {
  constructor(
    readonly userId: Uuid,
    readonly notificationId: Uuid,
  ) {}
}
