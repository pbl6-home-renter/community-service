import { MessageSendCommand } from 'modules/message/application/commands/message-send/message-send.command';
import { MessageSendCommandHandler } from 'modules/message/application/commands/message-send/message-send.command.handler';
import { ChatMessagePushNotifier } from 'modules/message/application/services/chat-message-push-notifier';
import { MessageMediaValidatorPort } from 'modules/message/application/ports/message-media-validator.port';
import { MessageEntity } from 'modules/message/domain/entities/message.entity';
import { MessageRepository } from 'modules/message/domain/repositories/message.repository';
import { MessageContentInvalidException } from 'modules/message/domain/exceptions/message-content-invalid.exception';
import { MessageReplyTargetInvalidException } from 'modules/message/domain/exceptions/message-reply-target-invalid.exception';
import { MessageType } from 'modules/message/domain/enums/message-type.enum';
import { ConversationEntity } from 'modules/conversation/domain/entities/conversation.entity';
import { ConversationRepository } from 'modules/conversation/domain/repositories/conversation.repository';
import { ConversationKind } from 'modules/conversation/domain/enums/conversation-kind.enum';
import { ConversationTitle } from 'modules/conversation/domain/value-objects/conversation-title.vo';
import { ConversationMemberEntity } from 'modules/conversation-member/domain/entities/conversation-member.entity';
import { ConversationMemberRepository } from 'modules/conversation-member/domain/repositories/conversation-member.repository';
import { ConversationMemberRole } from 'modules/conversation-member/domain/enums/conversation-member-role.enum';
import { ConversationParticipantType } from 'modules/conversation-member/domain/enums/conversation-participant-type.enum';
import { ChatRealtimePort } from 'modules/conversation/application/ports/chat-realtime.port';
import { PushDeliveryPort } from 'modules/push-device/application/ports/push-delivery.port';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

function createMember(
  conversationId: ReturnType<typeof generateUuid>,
  name: string,
) {
  return ConversationMemberEntity.create({
    conversationId,
    participantType: ConversationParticipantType.USER,
    userId: generateUuid(),
    displayName: name,
    role: ConversationMemberRole.MEMBER,
  });
}

function createConversationRepository(
  conversation: ConversationEntity,
): ConversationRepository {
  return {
    save: jest.fn(async () => undefined),
    findById: jest.fn(async () => conversation),
    delete: jest.fn(async () => undefined),
    findByContextForUpdate: jest.fn(async () => null),
    findByDirectPairKeyForUpdate: jest.fn(async () => null),
    findByIdForUpdate: jest.fn(async () => conversation),
  };
}

function createMemberRepository(
  sender: ConversationMemberEntity,
  activeMembers: ConversationMemberEntity[],
): ConversationMemberRepository {
  return {
    save: jest.fn(async () => undefined),
    findById: jest.fn(async () => sender),
    delete: jest.fn(async () => undefined),
    findByParticipant: jest.fn(async () => sender),
    findByIdForUpdate: jest.fn(async () => sender),
    findByParticipantForUpdate: jest.fn(async () => sender),
    findActiveUserMembersForUpdate: jest.fn(async () => activeMembers),
    findActiveUserMembers: jest.fn(async () => activeMembers),
  };
}

function createMessageRepository(
  existing: MessageEntity | null,
  replyTarget: MessageEntity | null,
): MessageRepository {
  return {
    save: jest.fn(async () => undefined),
    findById: jest.fn(async () => replyTarget),
    delete: jest.fn(async () => undefined),
    findByIdForUpdate: jest.fn(async () => existing),
    findByIdempotencyKey: jest.fn(async () => existing),
    nextSequenceForUpdate: jest.fn(async () => '17'),
    latestSequenceForUpdate: jest.fn(async () => '16'),
    latestSequenceAtOrBefore: jest.fn(async () => '16'),
    hasSequenceForConversation: jest.fn(async () => false),
    countUnread: jest.fn(async () => 0),
  };
}

function createHandler(input: {
  conversation: ConversationEntity;
  sender: ConversationMemberEntity;
  activeMembers: ConversationMemberEntity[];
  existingMessage?: MessageEntity | null;
  replyTarget?: MessageEntity | null;
}) {
  const context: TransactionContext = { kind: 'transaction' };
  const order: string[] = [];
  const conversations = createConversationRepository(input.conversation);
  const members = createMemberRepository(input.sender, input.activeMembers);
  const messages = createMessageRepository(
    input.existingMessage ?? null,
    input.replyTarget ?? null,
  );
  const mediaValidator: MessageMediaValidatorPort = {
    assertAttachable: jest.fn(async () => undefined),
  };
  const realtime: ChatRealtimePort = {
    messageCreated: jest.fn(() => order.push('created')),
    messageReceived: jest.fn(() => order.push('received')),
    readUpdated: jest.fn(),
    memberReadUpdated: jest.fn(),
    membershipRevoked: jest.fn(),
    membershipActivated: jest.fn(),
  };
  const pushDelivery: PushDeliveryPort = {
    send: jest.fn(async () => undefined),
  };
  const pushNotifier = new ChatMessagePushNotifier(members, pushDelivery);
  const unitOfWork: IUnitOfWork = {
    async run<T>(
      work: (transaction: TransactionContext) => Promise<T>,
    ): Promise<T> {
      const result = await work(context);
      order.push('committed');
      return result;
    },
  };
  const handler = new MessageSendCommandHandler(
    conversations,
    members,
    messages,
    mediaValidator,
    unitOfWork,
    realtime,
    pushNotifier,
  );

  return { handler, conversations, members, messages, realtime, order };
}

function createGroupConversation() {
  return ConversationEntity.create({
    kind: ConversationKind.GROUP,
    title: ConversationTitle.create('Lease discussion'),
  });
}

describe('MessageSendCommandHandler', () => {
  it('stores a message once and publishes realtime events after the transaction', async () => {
    const conversation = createGroupConversation();
    const sender = createMember(conversation.id, 'Sender');
    const recipient = createMember(conversation.id, 'Recipient');
    const { handler, messages, realtime, order } = createHandler({
      conversation,
      sender,
      activeMembers: [sender, recipient],
    });
    const command = new MessageSendCommand(
      conversation.id,
      sender.userId!,
      generateUuid(),
      MessageType.TEXT,
      'Hello',
      null,
    );

    const { message, replyTo } = await handler.execute(command);

    expect(message.sequence).toBe('17');
    expect(replyTo).toBeNull();
    expect(messages.save).toHaveBeenCalledWith(message, {
      kind: 'transaction',
    });
    expect(realtime.messageCreated).toHaveBeenCalledWith(
      message,
      sender.userId,
      null,
    );
    expect(realtime.messageReceived).toHaveBeenCalledWith(
      recipient.userId,
      expect.objectContaining({
        conversationName: 'Lease discussion',
        contentPreview: 'Hello',
      }),
    );
    expect(order[0]).toBe('committed');
    expect(order).toContain('created');
    expect(order).toContain('received');
  });

  it('returns the idempotent message without writing or notifying twice', async () => {
    const conversation = createGroupConversation();
    const sender = createMember(conversation.id, 'Sender');
    const existing = MessageEntity.create({
      conversationId: conversation.id,
      senderMemberId: sender.id,
      senderNameSnapshot: sender.displayName,
      type: MessageType.TEXT,
      content: 'Already saved',
      sequence: '16',
    });
    const { handler, messages, realtime } = createHandler({
      conversation,
      sender,
      activeMembers: [sender],
      existingMessage: existing,
    });

    const result = await handler.execute(
      new MessageSendCommand(
        conversation.id,
        sender.userId!,
        generateUuid(),
        MessageType.TEXT,
        'Already saved',
        null,
      ),
    );

    expect(result.message).toBe(existing);
    expect(result.replyTo).toBeNull();
    expect(messages.save).not.toHaveBeenCalled();
    expect(realtime.messageCreated).not.toHaveBeenCalled();
  });

  it('rejects text content with leading or trailing whitespace before opening a transaction', async () => {
    const conversation = createGroupConversation();
    const sender = createMember(conversation.id, 'Sender');
    const { handler, conversations, messages } = createHandler({
      conversation,
      sender,
      activeMembers: [sender],
    });

    await expect(
      handler.execute(
        new MessageSendCommand(
          conversation.id,
          sender.userId!,
          generateUuid(),
          MessageType.TEXT,
          ' Hello ',
          null,
        ),
      ),
    ).rejects.toThrow(MessageContentInvalidException);
    expect(conversations.findByIdForUpdate).not.toHaveBeenCalled();
    expect(messages.save).not.toHaveBeenCalled();
  });
});

describe('MessageSendCommandHandler replies', () => {
  function original(
    conversationId: ReturnType<typeof generateUuid>,
    overrides: Partial<Parameters<typeof MessageEntity.create>[0]> = {},
  ) {
    return MessageEntity.create({
      conversationId,
      senderMemberId: generateUuid(),
      senderNameSnapshot: 'Landlord',
      type: MessageType.TEXT,
      content: 'Thợ qua lúc 9 giờ nhé',
      sequence: '10',
      ...overrides,
    });
  }

  function replyCommand(
    conversationId: ReturnType<typeof generateUuid>,
    senderUserId: ReturnType<typeof generateUuid>,
    replyToMessageId: ReturnType<typeof generateUuid>,
    clientMessageId = generateUuid(),
  ) {
    return new MessageSendCommand(
      conversationId,
      senderUserId,
      clientMessageId,
      MessageType.TEXT,
      'Dạ vâng',
      null,
      replyToMessageId,
    );
  }

  it('stores the reference and returns the quote in the response and realtime event', async () => {
    const conversation = createGroupConversation();
    const sender = createMember(conversation.id, 'Sender');
    const target = original(conversation.id);
    const { handler, messages, realtime } = createHandler({
      conversation,
      sender,
      activeMembers: [sender],
      replyTarget: target,
    });

    const { message, replyTo } = await handler.execute(
      replyCommand(conversation.id, sender.userId!, target.id),
    );

    expect(message.replyToMessageId).toBe(target.id);
    expect(messages.save).toHaveBeenCalledWith(message, {
      kind: 'transaction',
    });
    expect(replyTo).toEqual({
      id: target.id,
      senderName: 'Landlord',
      type: MessageType.TEXT,
      contentPreview: 'Thợ qua lúc 9 giờ nhé',
      isUnavailable: false,
    });
    expect(realtime.messageCreated).toHaveBeenCalledWith(
      message,
      sender.userId,
      replyTo,
    );
  });

  it.each([
    ['belongs to another conversation', () => original(generateUuid())],
    [
      'is a system message',
      (conversationId: ReturnType<typeof generateUuid>) =>
        original(conversationId, {
          type: MessageType.SYSTEM,
          content: null,
        }),
    ],
    [
      'is deleted',
      (conversationId: ReturnType<typeof generateUuid>) =>
        original(conversationId, { isDeleted: true }),
    ],
  ])(
    'rejects a reply whose original %s without writing or notifying',
    async (_case, buildTarget) => {
      const conversation = createGroupConversation();
      const sender = createMember(conversation.id, 'Sender');
      const target = buildTarget(conversation.id);
      const { handler, messages, realtime } = createHandler({
        conversation,
        sender,
        activeMembers: [sender],
        replyTarget: target,
      });

      await expect(
        handler.execute(
          replyCommand(conversation.id, sender.userId!, target.id),
        ),
      ).rejects.toThrow(MessageReplyTargetInvalidException);
      expect(messages.save).not.toHaveBeenCalled();
      expect(realtime.messageCreated).not.toHaveBeenCalled();
    },
  );

  it('rejects a reply to a message that cannot be found', async () => {
    const conversation = createGroupConversation();
    const sender = createMember(conversation.id, 'Sender');
    const { handler, messages } = createHandler({
      conversation,
      sender,
      activeMembers: [sender],
      replyTarget: null,
    });

    await expect(
      handler.execute(
        replyCommand(conversation.id, sender.userId!, generateUuid()),
      ),
    ).rejects.toThrow(MessageReplyTargetInvalidException);
    expect(messages.save).not.toHaveBeenCalled();
  });

  it('returns the stored reply on retry even when the original is gone, without a duplicate', async () => {
    const conversation = createGroupConversation();
    const sender = createMember(conversation.id, 'Sender');
    const clientMessageId = generateUuid();
    const originalId = generateUuid();
    const stored = MessageEntity.create({
      conversationId: conversation.id,
      senderMemberId: sender.id,
      senderNameSnapshot: sender.displayName,
      clientMessageId,
      type: MessageType.TEXT,
      content: 'Dạ vâng',
      replyToMessageId: originalId,
      sequence: '16',
    });
    const { handler, messages, realtime } = createHandler({
      conversation,
      sender,
      activeMembers: [sender],
      existingMessage: stored,
      replyTarget: null,
    });

    const result = await handler.execute(
      replyCommand(
        conversation.id,
        sender.userId!,
        originalId,
        clientMessageId,
      ),
    );

    expect(result.message).toBe(stored);
    expect(result.replyTo).toEqual({
      id: originalId,
      senderName: null,
      type: null,
      contentPreview: null,
      isUnavailable: true,
    });
    expect(messages.save).not.toHaveBeenCalled();
    expect(messages.nextSequenceForUpdate).not.toHaveBeenCalled();
    expect(realtime.messageCreated).not.toHaveBeenCalled();
  });
});
