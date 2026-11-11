import { CommandBus } from '@nestjs/cqrs';
import { ContractContextApplyCommand } from 'modules/conversation/application/commands/contract-context-apply/contract-context-apply.command';
import { ContractContextApplyCommandHandler } from 'modules/conversation/application/commands/contract-context-apply/contract-context-apply.command.handler';
import {
  ContractContextEventValidator,
  ContractContextIntegrationEvent,
} from 'modules/conversation/presentation/messaging/contract-context.integration-event';
import { ContractContextSubscriber } from 'modules/conversation/presentation/messaging/contract-context.subscriber';
import { ContractContextEventStore } from 'modules/conversation/application/ports/contract-context-event-store.port';
import { ConversationUserLookup } from 'modules/conversation/application/ports/conversation-user-lookup.port';
import { ChatRealtimePort } from 'modules/conversation/application/ports/chat-realtime.port';
import { ConversationEntity } from 'modules/conversation/domain/entities/conversation.entity';
import { ConversationRepository } from 'modules/conversation/domain/repositories/conversation.repository';
import { ConversationMemberEntity } from 'modules/conversation-member/domain/entities/conversation-member.entity';
import { ConversationMemberStatus } from 'modules/conversation-member/domain/enums/conversation-member-status.enum';
import { ConversationMemberRepository } from 'modules/conversation-member/domain/repositories/conversation-member.repository';
import { InboxRepository } from 'modules/inbox/application/ports/inbox.repository';
import { MessageRepository } from 'modules/message/domain/repositories/message.repository';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { generateUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';

jest.mock('@golevelup/nestjs-rabbitmq', () => ({
  RabbitSubscribe: () => () => undefined,
}));

const contractId = generateUuid();
const landlordId = generateUuid();
const tenantId = generateUuid();
const newcomerId = generateUuid();
const activationTime = '2026-01-01T10:00:00.000Z';

function event(
  eventType: ContractContextIntegrationEvent['eventType'],
  occurredAt: string,
  userId: Uuid = tenantId,
): ContractContextIntegrationEvent {
  const base = {
    id: generateUuid(),
    routingKey: eventType,
    aggregateType: 'contract',
    aggregateId: contractId,
    occurredAt,
  };
  switch (eventType) {
    case 'contract.activated':
      return {
        ...base,
        eventType,
        payload: {
          contractId,
          buildingId: generateUuid(),
          roomId: generateUuid(),
          landlordId,
          tenantUserIds: [tenantId],
        },
      };
    case 'contract_member.added':
      return {
        ...base,
        eventType,
        payload: {
          contractId,
          contractMemberId: generateUuid(),
          tenantUserId: userId,
        },
      };
    case 'contract_member.linked':
      return {
        ...base,
        eventType,
        payload: {
          contractId,
          contractMemberId: generateUuid(),
          tenantUserId: userId,
        },
      };
    case 'contract_member.left':
      return {
        ...base,
        eventType,
        payload: {
          contractId,
          contractMemberId: generateUuid(),
          tenantUserId: userId,
        },
      };
  }
}

function setup() {
  const context: TransactionContext = { kind: 'transaction' };
  const order: string[] = [];
  const received = new Set<Uuid>();
  const stored: Array<{
    event: ContractContextIntegrationEvent;
    applied: boolean;
  }> = [];
  const members = new Map<Uuid, ConversationMemberEntity>();
  let conversation: ConversationEntity | null = null;
  const conversationSave = jest.fn(async (item: ConversationEntity) => {
    conversation = item;
  });
  const memberSave = jest.fn(async (item: ConversationMemberEntity) => {
    members.set(item.userId!, item);
  });
  const messageCutoff = jest.fn(async (_id: Uuid, _at: Date) => '7');
  const inbox = {
    recordIfNew: jest.fn(async (id: Uuid) => {
      if (received.has(id)) return false;
      received.add(id);
      return true;
    }),
  } as unknown as InboxRepository;
  const eventStore = {
    lockContract: jest.fn(async () => undefined),
    save: jest.fn(async (item: ContractContextIntegrationEvent) => {
      stored.push({ event: item, applied: false });
    }),
    findActivation: jest.fn(
      async () =>
        stored.find((row) => row.event.eventType === 'contract.activated')
          ?.event ?? null,
    ),
    findPending: jest.fn(async () =>
      stored
        .filter((row) => !row.applied)
        .map((row) => row.event)
        .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)),
    ),
    hasLaterApplied: jest.fn(
      async (_contractId: Uuid, userId: Uuid, at: string) =>
        stored.some(
          (row) =>
            row.applied &&
            row.event.occurredAt > at &&
            (row.event.eventType === 'contract.activated'
              ? row.event.payload.tenantUserIds.includes(userId)
              : row.event.payload.tenantUserId === userId),
        ),
    ),
    markApplied: jest.fn(async (id: Uuid) => {
      stored.find((row) => row.event.id === id)!.applied = true;
    }),
  } as unknown as ContractContextEventStore;
  const conversations = {
    findByContextForUpdate: jest.fn(async () => conversation),
    save: conversationSave,
  } as unknown as ConversationRepository;
  const memberRepository = {
    findByParticipantForUpdate: jest.fn(
      async (_id: Uuid, identity: { userId: Uuid }) =>
        members.get(identity.userId) ?? null,
    ),
    save: memberSave,
  } as unknown as ConversationMemberRepository;
  const messages = {
    latestSequenceAtOrBefore: messageCutoff,
    latestSequenceForUpdate: jest.fn(async () => '99'),
  } as unknown as MessageRepository;
  const unitOfWork: IUnitOfWork = {
    async run<T>(
      work: (transaction: TransactionContext) => Promise<T>,
    ): Promise<T> {
      const result = await work(context);
      order.push('committed');
      return result;
    },
  };
  const realtime = {
    membershipActivated: jest.fn(() => order.push('activated')),
    membershipRevoked: jest.fn(() => order.push('revoked')),
  } as unknown as ChatRealtimePort;
  const userLookup = {
    findDisplayNames: jest.fn(
      async (ids: Uuid[]) =>
        new Map(
          ids.map((id) => [
            id.toLowerCase(),
            id === landlordId
              ? 'Landlord Name'
              : id === newcomerId
                ? 'Newcomer Name'
                : 'Tenant Name',
          ]),
        ),
    ),
  } as ConversationUserLookup;
  const handler = new ContractContextApplyCommandHandler(
    conversations,
    memberRepository,
    messages,
    eventStore,
    userLookup,
  );
  const commandBus = {
    execute: jest.fn(async (command: ContractContextApplyCommand) =>
      handler.execute(command),
    ),
  } as unknown as CommandBus;
  const subscriber = new ContractContextSubscriber(
    commandBus,
    inbox,
    unitOfWork,
    realtime,
  );
  return {
    subscriber,
    commandBus,
    inbox,
    eventStore,
    order,
    members,
    stored,
    conversationSave,
    memberSave,
    messageCutoff,
    messages,
    realtime,
    userLookup,
    get conversation() {
      return conversation;
    },
  };
}

describe('ContractContextSubscriber and apply command', () => {
  it('creates one conversation with real names and ignores a duplicate activation', async () => {
    const state = setup();
    const activated = event('contract.activated', activationTime);
    await state.subscriber.handle(activated);
    await state.subscriber.handle(activated);

    expect(state.conversationSave).toHaveBeenCalledTimes(1);
    expect(state.commandBus.execute).toHaveBeenCalledTimes(1);
    expect(state.inbox.recordIfNew).toHaveBeenCalledWith(
      activated.id,
      activated.eventType,
      { kind: 'transaction' },
    );
    expect(state.eventStore.lockContract).toHaveBeenCalledWith(contractId, {
      kind: 'transaction',
    });
    expect(state.order.indexOf('committed')).toBeLessThan(
      state.order.indexOf('activated'),
    );
    expect(state.members.get(landlordId)?.displayName).toBe('Landlord Name');
    expect(state.members.get(tenantId)?.displayName).toBe('Tenant Name');
    expect(state.members.get(tenantId)?.status).toBe(
      ConversationMemberStatus.ACTIVE,
    );
    expect(state.messageCutoff).toHaveBeenCalledWith(
      state.conversation!.id,
      new Date(activationTime),
      expect.anything(),
    );
    expect(state.messages.latestSequenceForUpdate).not.toHaveBeenCalled();
  });

  it('keeps member events pending until activation, then applies add and leave in order', async () => {
    const state = setup();
    const addedAt = '2026-01-01T11:00:00.000Z';
    const leftAt = '2026-01-01T12:00:00.000Z';
    await state.subscriber.handle(
      event('contract_member.added', addedAt, newcomerId),
    );
    await state.subscriber.handle(
      event('contract_member.left', leftAt, newcomerId),
    );
    expect(state.conversationSave).not.toHaveBeenCalled();
    expect(state.stored.every((row) => !row.applied)).toBe(true);
    expect(state.userLookup.findDisplayNames).not.toHaveBeenCalled();

    await state.subscriber.handle(event('contract.activated', activationTime));
    expect(state.conversationSave).toHaveBeenCalledTimes(1);
    expect(state.members.get(newcomerId)?.displayName).toBe('Newcomer Name');
    expect(state.members.get(newcomerId)?.status).toBe(
      ConversationMemberStatus.READ_ONLY,
    );
    expect(state.members.get(newcomerId)?.leftAt).toEqual(new Date(leftAt));
    expect(state.members.get(newcomerId)?.leftSequence).toBe('7');
    expect(state.messageCutoff).toHaveBeenCalledWith(
      state.conversation!.id,
      new Date(addedAt),
      expect.anything(),
    );
    expect(state.messageCutoff).toHaveBeenCalledWith(
      state.conversation!.id,
      new Date(leftAt),
      expect.anything(),
    );
    expect(state.stored.every((row) => row.applied)).toBe(true);
  });

  it('does not grant chat history to a user who never joined', async () => {
    const state = setup();
    await state.subscriber.handle(event('contract.activated', activationTime));
    await state.subscriber.handle(
      event('contract_member.left', '2026-01-01T12:00:00.000Z', newcomerId),
    );
    expect(state.members.has(newcomerId)).toBe(false);
    expect(state.memberSave).toHaveBeenCalledTimes(2);
  });

  it('accepts a leave event for an unlinked contract member without granting access', async () => {
    const state = setup();
    const left = {
      ...event('contract_member.left', '2026-01-01T11:00:00.000Z'),
      payload: {
        contractId,
        contractMemberId: generateUuid(),
        tenantUserId: null,
      },
    } as ContractContextIntegrationEvent;
    ContractContextEventValidator.assert(left);
    await state.subscriber.handle(left);
    await state.subscriber.handle(event('contract.activated', activationTime));
    expect(state.members.size).toBe(2);
    expect(state.stored.every((row) => row.applied)).toBe(true);
  });

  it('links a new tenant with their Identity display name', async () => {
    const state = setup();
    await state.subscriber.handle(event('contract.activated', activationTime));
    await state.subscriber.handle(
      event('contract_member.linked', '2026-01-01T11:00:00.000Z', newcomerId),
    );
    expect(state.members.get(newcomerId)?.displayName).toBe('Newcomer Name');
    expect(state.members.get(newcomerId)?.status).toBe(
      ConversationMemberStatus.ACTIVE,
    );
  });

  it('does not reactivate a departed member when an older add arrives late', async () => {
    const state = setup();
    await state.subscriber.handle(event('contract.activated', activationTime));
    await state.subscriber.handle(
      event('contract_member.left', '2026-01-01T13:00:00.000Z'),
    );
    await state.subscriber.handle(
      event('contract_member.added', '2026-01-01T12:00:00.000Z'),
    );
    expect(state.members.get(tenantId)?.status).toBe(
      ConversationMemberStatus.READ_ONLY,
    );
    expect(state.realtime.membershipActivated).toHaveBeenCalledTimes(2);
  });

  it('does not apply a member event older than the activation snapshot', async () => {
    const state = setup();
    await state.subscriber.handle(event('contract.activated', activationTime));
    await state.subscriber.handle(
      event('contract_member.added', '2026-01-01T09:00:00.000Z', newcomerId),
    );
    expect(state.members.has(newcomerId)).toBe(false);
    expect(state.stored.every((row) => row.applied)).toBe(true);
  });
});
