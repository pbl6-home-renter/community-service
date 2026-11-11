import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractContextChange } from '../commands/contract-context-apply/contract-context-apply.command';

export interface ContractContextEventStore {
  lockContract(contractId: Uuid, context: TransactionContext): Promise<void>;
  save(
    event: ContractContextChange,
    contractId: Uuid,
    tenantUserId: Uuid | null,
    context: TransactionContext,
  ): Promise<void>;
  findActivation(
    contractId: Uuid,
    context: TransactionContext,
  ): Promise<Extract<
    ContractContextChange,
    { eventType: 'contract.activated' }
  > | null>;
  findPending(
    contractId: Uuid,
    context: TransactionContext,
  ): Promise<ContractContextChange[]>;
  hasLaterApplied(
    contractId: Uuid,
    tenantUserId: Uuid,
    occurredAt: string,
    eventId: Uuid,
    context: TransactionContext,
  ): Promise<boolean>;
  markApplied(eventId: Uuid, context: TransactionContext): Promise<void>;
}
