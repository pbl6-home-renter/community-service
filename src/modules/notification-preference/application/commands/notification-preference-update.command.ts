import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { NotificationPreferenceValue } from '../ports/notification-preference-value';
export class NotificationPreferenceUpdateCommand {
  constructor(
    readonly userId: Uuid,
    readonly preferences: NotificationPreferenceValue[],
  ) {}
}
