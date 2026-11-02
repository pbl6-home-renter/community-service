import { Uuid } from 'shared/domain/value-objects/uuid.vo';
export class PushDeviceRegisterCommand {
  constructor(
    readonly userId: Uuid,
    readonly token: string,
  ) {}
}
