import { Uuid } from 'shared/domain/value-objects/uuid.vo';
export class PushDeviceRevokeCommand {
  constructor(
    readonly userId: Uuid,
    readonly deviceId: Uuid,
  ) {}
}
