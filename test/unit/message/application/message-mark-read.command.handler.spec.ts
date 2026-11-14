import { MessageMarkReadCommand } from 'modules/message/application/commands/message-mark-read/message-mark-read.command';
import { MessageMarkReadCommandHandler } from 'modules/message/application/commands/message-mark-read/message-mark-read.command.handler';
import { MessageRepository } from 'modules/message/domain/repositories/message.repository';
import { ConversationEntity } from 'modules/conversation/domain/entities/conversation.entity';
import { ConversationRepository } from 'modules/conversation/domain/repositories/conversation.repository';
import { ConversationKind } from 'modules/conversation/domain/enums/conversation-kind.enum';
import { ConversationTitle } from 'modules/conversation/domain/value-objects/conversation-title.vo';
import { ChatRealtimePort } from 'modules/conversation/application/ports/chat-realtime.port';
import { ConversationMemberEntity } from 'modules/conversation-member/domain/entities/conversation-member.entity';
import { ConversationMemberRepository } from 'modules/conversation-member/domain/repositories/conversation-member.repository';
import { ConversationMemberRole } from 'modules/conversation-member/domain/enums/conversation-member-role.enum';
import { ConversationParticipantType } from 'modules/conversation-member/domain/enums/conversation-participant-type.enum';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

function setup(
  member: ConversationMemberEntity,
  conversation: ConversationEntity,
) {
  const order: string[] = [];
  const conversations: ConversationRepository = {
    save: jest.fn(async () => undefined),
    findById: jest.fn(async () => conversation),
    delete: jest.fn(async () => undefined),
    findByContextForUpdate: jest.fn(async () => null),
    findByDirectPairKeyForUpdate: jest.fn(async () => null),
    findByIdForUpdate: jest.fn(async () => conversation),
  };
  const members: ConversationMemberRepository = {
    save: jest.fn(async () => undefined),
    findById: jest.fn(async () => member),
    delete: jest.fn(async () => undefined),
    findByParticipant: jest.fn(async () => member),
    findByIdForUpdate: jest.fn(async () => member),
    findByParticipantForUpdate: jest.fn(async () => member),
    findActiveUserMembersForUpdate: jest.fn(async () => [member]),
    findActiveUserMembers: jest.fn(async () => [member]),
  };
  const messages: MessageRepository = {
    save: jest.fn(async () => undefined),
    findById: jest.fn(async () => null),
    delete: jest.fn(async () => undefined),
    findByIdForUpdate: jest.fn(async () => null),
    findByIdempotencyKey: jest.fn(async () => null),
    nextSequenceForUpdate: jest.fn(async () => '21'),
    latestSequenceForUpdate: jest.fn(async () => '20'),
    latestSequenceAtOrBefore: jest.fn(async () => '20'),
    hasSequenceForConversation: jest.fn(async () => true),
    countUnread: jest.fn(async () => 0),
  };
  const realtime: ChatRealtimePort = {
    messageCreated: jest.fn(),
    messageReceived: jest.fn(),
    readUpdated: jest.fn(() => order.push('read-updated')),
    memberReadUpdated: jest.fn(() => order.push('member-read')),
    membershipRevoked: jest.fn(),
    membershipActivated: jest.fn(),
  };
  const unitOfWork: IUnitOfWork = {
    async run<T>(work: (context: TransactionContext) => Promise<T>) {
      const result = await work({ kind: 'transaction' });
      order.push('committed');
      return result;
    },
  };
  const handler = new MessageMarkReadCommandHandler(
    conversations,
    members,
    messages,
    unitOfWork,
    realtime,
  );
  return { handler, realtime, order };
}

function activeMember(conversationId: ReturnType<typeof generateUuid>) {
  return ConversationMemberEntity.create({
    conversationId,
    participantType: ConversationParticipantType.USER,
    userId: generateUuid(),
    displayName: 'Reader',
    role: ConversationMemberRole.MEMBER,
    lastReadSequence: '5',
  });
}

function groupConversation() {
  return ConversationEntity.create({
    kind: ConversationKind.GROUP,
    title: ConversationTitle.create('Phòng 101'),
  });
}

describe('MessageMarkReadCommandHandler read receipts', () => {
  it('publishes member-read to the conversation room after commit when the cursor advances', async () => {
    const conversation = groupConversation();
    const member = activeMember(conversation.id);
    const { handler, realtime, order } = setup(member, conversation);

    await handler.execute(
      new MessageMarkReadCommand(conversation.id, member.userId!, '12'),
    );

    expect(realtime.memberReadUpdated).toHaveBeenCalledWith(
      conversation.id,
      member.userId,
      '12',
    );
    expect(order).toEqual(['committed', 'read-updated', 'member-read']);
  });

  it('publishes nothing when the cursor does not move', async () => {
    const conversation = groupConversation();
    const member = activeMember(conversation.id);
    const { handler, realtime } = setup(member, conversation);

    await handler.execute(
      new MessageMarkReadCommand(conversation.id, member.userId!, '5'),
    );

    expect(realtime.readUpdated).not.toHaveBeenCalled();
    expect(realtime.memberReadUpdated).not.toHaveBeenCalled();
  });

  it('does not count a read-only member as a reader', async () => {
    const conversation = groupConversation();
    const member = activeMember(conversation.id);
    member.markReadOnly(new Date(), '15');
    const { handler, realtime } = setup(member, conversation);

    await handler.execute(
      new MessageMarkReadCommand(conversation.id, member.userId!, '12'),
    );

    expect(realtime.readUpdated).toHaveBeenCalled();
    expect(realtime.memberReadUpdated).not.toHaveBeenCalled();
  });
});
