import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class NotificationsMarkAllReadCommand {
  constructor(readonly userId: Uuid) {}
}
