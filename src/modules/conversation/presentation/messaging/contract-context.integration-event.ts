import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { isValidUuid } from 'shared/domain/value-objects/uuid.vo';
import { IntegrationEvent } from 'shared/application/messaging/integration-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  CONTRACT_ACTIVATED_EVENT,
  CONTRACT_MEMBER_ADDED_EVENT,
  CONTRACT_MEMBER_LEFT_EVENT,
  CONTRACT_MEMBER_LINKED_EVENT,
} from './contract-context-consumer.constants';

type ContractEvent<
  TType extends string,
  TPayload,
> = IntegrationEvent<TPayload> & {
  readonly eventType: TType;
};

export type ContractContextIntegrationEvent =
  | ContractEvent<
      'contract.activated',
      {
        contractId: Uuid;
        buildingId: Uuid;
        roomId: Uuid;
        landlordId: Uuid;
        tenantUserIds: Uuid[];
      }
    >
  | ContractEvent<
      'contract_member.added',
      {
        contractId: Uuid;
        contractMemberId: Uuid;
        tenantUserId: Uuid | null;
      }
    >
  | ContractEvent<
      'contract_member.linked',
      {
        contractId: Uuid;
        contractMemberId: Uuid;
        tenantUserId: Uuid;
      }
    >
  | ContractEvent<
      'contract_member.left',
      {
        contractId: Uuid;
        contractMemberId: Uuid;
        tenantUserId: Uuid | null;
      }
    >;

export class ContractContextEventValidator {
  static assert(
    value: unknown,
  ): asserts value is ContractContextIntegrationEvent {
    if (
      !this.isRecord(value) ||
      !this.isUuid(value.id) ||
      !this.isRecord(value.payload) ||
      !this.isUuid(value.payload.contractId) ||
      typeof value.occurredAt !== 'string' ||
      !Number.isFinite(Date.parse(value.occurredAt)) ||
      value.routingKey !== value.eventType
    ) {
      throw new ValidationException(
        'Invalid contract context integration event',
      );
    }

    const payload = value.payload;
    switch (value.eventType) {
      case CONTRACT_ACTIVATED_EVENT:
        if (
          !this.isUuid(payload.buildingId) ||
          !this.isUuid(payload.roomId) ||
          !this.isUuid(payload.landlordId) ||
          !Array.isArray(payload.tenantUserIds) ||
          !payload.tenantUserIds.every((id) => this.isUuid(id))
        ) {
          throw new ValidationException('Invalid contract.activated payload');
        }
        return;
      case CONTRACT_MEMBER_ADDED_EVENT:
      case CONTRACT_MEMBER_LEFT_EVENT:
        if (
          this.isUuid(payload.contractMemberId) &&
          (payload.tenantUserId === null || this.isUuid(payload.tenantUserId))
        )
          return;
        break;
      case CONTRACT_MEMBER_LINKED_EVENT:
        if (
          this.isUuid(payload.contractMemberId) &&
          this.isUuid(payload.tenantUserId)
        )
          return;
        break;
    }
    throw new ValidationException('Invalid contract member payload');
  }

  private static isUuid(value: unknown): boolean {
    return typeof value === 'string' && isValidUuid(value);
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
