import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class ContractMembershipLinkCommand {
  constructor(
    readonly eventId: Uuid,
    readonly eventType: string,
    readonly contractId: Uuid,
    readonly tenantUserId: Uuid,
  ) {}
}
