import { Uuid } from 'shared/domain/value-objects/uuid.vo';
export class NotificationPreferenceGetQuery {
  constructor(readonly userId: Uuid) {}
}
