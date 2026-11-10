import { IntegrationEvent } from 'shared/application/messaging/integration-event';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { isValidUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';
import { CONTRACT_MEMBER_LINKED_EVENT } from './contract-context-consumer.constants';

export type ContractMemberLinkedIntegrationEvent = IntegrationEvent<{
  contractId: Uuid;
  contractMemberId: Uuid;
  tenantUserId: Uuid;
}>;

export class ContractMemberLinkedEventValidator {
  static assert(
    event: unknown,
  ): asserts event is ContractMemberLinkedIntegrationEvent {
    if (
      !this.isRecord(event) ||
      typeof event.id !== 'string' ||
      !isValidUuid(event.id) ||
      event.eventType !== CONTRACT_MEMBER_LINKED_EVENT ||
      event.routingKey !== CONTRACT_MEMBER_LINKED_EVENT ||
      !this.isRecord(event.payload)
    ) {
      throw new ValidationException(
        'Invalid contract_member.linked integration event',
      );
    }
    const payload = event.payload;
    if (
      ['contractId', 'contractMemberId', 'tenantUserId'].some(
        (field) =>
          typeof payload[field] !== 'string' || !isValidUuid(payload[field]),
      )
    ) {
      throw new ValidationException(
        'Invalid contract_member.linked integration event',
      );
    }
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
