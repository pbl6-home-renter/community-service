import { BuildingContextSubscriber } from 'modules/conversation/presentation/messaging/building-context.subscriber';
import { BuildingCreatedIntegrationEvent } from 'modules/conversation/presentation/messaging/building-created.integration-event';
import { ConversationEntity } from 'modules/conversation/domain/entities/conversation.entity';
import { ConversationMemberEntity } from 'modules/conversation-member/domain/entities/conversation-member.entity';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

jest.mock('@golevelup/nestjs-rabbitmq', () => ({
  RabbitSubscribe: () => () => undefined,
}));

describe('BuildingContextSubscriber', () => {
  const buildingId = generateUuid();
  const landlordId = generateUuid();
  const event: BuildingCreatedIntegrationEvent = {
    id: generateUuid(),
    eventType: 'building.created',
    routingKey: 'building.created',
    aggregateType: 'building',
    aggregateId: buildingId,
    occurredAt: '2026-01-01T00:00:00.000Z',
    payload: { id: buildingId, landlordId, name: 'Building A' },
  };

  it('records the event and creates the building chat in one transaction, then ignores replay', async () => {
    const context: TransactionContext = { kind: 'transaction' };
    const processed = new Set<string>();
    let conversation: ConversationEntity | null = null;
    let member: ConversationMemberEntity | null = null;
    const inbox = {
      recordIfNew: jest.fn(async (id: string) => {
        if (processed.has(id)) return false;
        processed.add(id);
        return true;
      }),
    };
    const conversations = {
      findByContextForUpdate: jest.fn(async () => conversation),
      save: jest.fn(async (value: ConversationEntity) => {
        conversation = value;
      }),
    };
    const members = {
      findByParticipantForUpdate: jest.fn(async () => member),
      save: jest.fn(async (value: ConversationMemberEntity) => {
        member = value;
      }),
    };
    const messages = { latestSequenceForUpdate: jest.fn() };
    const unitOfWork = {
      run: jest.fn(async <T>(work: (ctx: TransactionContext) => Promise<T>) =>
        work(context),
      ),
    };
    const userLookup = {
      findDisplayNames: jest.fn(async () =>
        new Map([[landlordId.toLowerCase(), 'Landlord']]),
      ),
    };
    const realtime = { membershipActivated: jest.fn() };
    const subscriber = new BuildingContextSubscriber(
      conversations as never,
      members as never,
      messages as never,
      inbox as never,
      unitOfWork as never,
      userLookup as never,
      realtime as never,
    );

    await subscriber.handle(event);
    await subscriber.handle(event);

    expect(inbox.recordIfNew).toHaveBeenCalledTimes(2);
    expect(inbox.recordIfNew).toHaveBeenCalledWith(
      event.id,
      event.eventType,
      context,
    );
    expect(conversations.findByContextForUpdate).toHaveBeenCalledWith(
      'building',
      buildingId,
      context,
    );
    expect(conversations.save).toHaveBeenCalledTimes(1);
    expect(conversations.save).toHaveBeenCalledWith(conversation, context);
    expect(members.save).toHaveBeenCalledTimes(1);
    expect(members.save).toHaveBeenCalledWith(member, context);
    const savedMember = members.save.mock.calls[0][0];
    expect(savedMember.userId).toBe(landlordId);
    expect(savedMember.role).toBe('admin');
    expect(realtime.membershipActivated).toHaveBeenCalledTimes(1);
  });
});
