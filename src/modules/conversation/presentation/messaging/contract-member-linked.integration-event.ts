import { IntegrationEvent } from 'shared/application/messaging/integration-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export type ContractMemberLinkedIntegrationEvent = IntegrationEvent<{
  contractId: Uuid;
  contractMemberId: Uuid;
  tenantUserId: Uuid;
}>;
