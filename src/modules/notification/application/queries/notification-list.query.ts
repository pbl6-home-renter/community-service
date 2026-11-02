import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class NotificationListQuery {
  constructor(
    readonly userId: Uuid,
    readonly cursor: string | undefined,
    readonly pageSize: number,
    readonly unreadOnly?: boolean,
  ) {}
}
