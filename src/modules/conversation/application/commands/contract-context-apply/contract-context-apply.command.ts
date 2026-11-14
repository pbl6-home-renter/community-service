import { IntegrationEvent } from 'shared/application/messaging/integration-event';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

type Change<TType extends string, TPayload> = IntegrationEvent<TPayload> & {
  readonly eventType: TType;
};

export type ContractContextChange =
  | Change<
      'contract.activated',
      {
        contractId: Uuid;
        buildingId: Uuid;
        roomId: Uuid;
        landlordId: Uuid;
        tenantUserIds: Uuid[];
      }
    >
  | Change<
      'contract_member.added',
      {
        contractId: Uuid;
        contractMemberId: Uuid;
        tenantUserId: Uuid | null;
      }
    >
  | Change<
      'contract_member.linked',
      {
        contractId: Uuid;
        contractMemberId: Uuid;
        tenantUserId: Uuid;
      }
    >
  | Change<
      'contract_member.left',
      {
        contractId: Uuid;
        contractMemberId: Uuid;
        tenantUserId: Uuid | null;
      }
    >;

export type ContractMembershipChange = {
  userId: Uuid;
  conversationId: Uuid;
  active: boolean;
};

export class ContractContextApplyCommand {
  constructor(
    readonly event: ContractContextChange,
    readonly context: TransactionContext,
  ) {}
}
