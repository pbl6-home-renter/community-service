import { ConversationCreateCommand } from 'modules/conversation/application/commands/conversation-create/conversation-create.command';
import { ConversationCreateCommandHandler } from 'modules/conversation/application/commands/conversation-create/conversation-create.command.handler';
import { ChatRealtimePort } from 'modules/conversation/application/ports/chat-realtime.port';
import { ConversationUserLookup } from 'modules/conversation/application/ports/conversation-user-lookup.port';
import { ConversationRepository } from 'modules/conversation/domain/repositories/conversation.repository';
import { ConversationEntity } from 'modules/conversation/domain/entities/conversation.entity';
import { ConversationKind } from 'modules/conversation/domain/enums/conversation-kind.enum';
import { ConversationGroupMembersInsufficientException } from 'modules/conversation/domain/exceptions/conversation-group-members-insufficient.exception';
import { ConversationMemberRepository } from 'modules/conversation-member/domain/repositories/conversation-member.repository';
import { MessageRepository } from 'modules/message/domain/repositories/message.repository';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

describe('ConversationCreateCommandHandler', () => {
  it('creates a deduplicated group with the creator as admin and activates memberships after commit', async () => {
    const callerId = generateUuid();
    const firstMemberId = generateUuid();
    const secondMemberId = generateUuid();
    const context: TransactionContext = { kind: 'transaction' };
    const order: string[] = [];
    const conversations = {
      save: jest.fn(
        async (
          _conversation: ConversationEntity,
          passedContext: TransactionContext,
        ) => {
          expect(passedContext).toBe(context);
          order.push('conversation-saved');
        },
      ),
    } as unknown as ConversationRepository;
    const members = {
      save: jest.fn(async (_member, passedContext: TransactionContext) => {
        expect(passedContext).toBe(context);
        order.push('member-saved');
      }),
    } as unknown as ConversationMemberRepository;
    const unitOfWork: IUnitOfWork = {
      run: jest.fn(async (work) => {
        const result = await work(context);
        order.push('committed');
        return result;
      }),
    };
    const allDisplayNames = new Map([
      [callerId, 'Creator'],
      [firstMemberId, 'Member One'],
      [secondMemberId, 'Member Two'],
    ]);
    const userLookup: ConversationUserLookup = {
      findDisplayNames: jest.fn(async (userIds) => {
        const found = new Map<string, string>();
        for (const userId of userIds) {
          const displayName = allDisplayNames.get(userId);
          if (displayName) found.set(userId, displayName);
        }
        return found;
      }),
    };
    const realtime: ChatRealtimePort = {
      membershipActivated: jest.fn((userId) =>
        order.push(`activated:${userId}`),
      ),
      messageCreated: jest.fn(),
      messageReceived: jest.fn(),
      readUpdated: jest.fn(),
      memberReadUpdated: jest.fn(),
      membershipRevoked: jest.fn(),
    };
    const handler = new ConversationCreateCommandHandler(
      conversations,
      members,
      {} as MessageRepository,
      unitOfWork,
      userLookup,
      realtime,
    );

    const result = await handler.execute(
      new ConversationCreateCommand(
        ConversationKind.GROUP,
        callerId,
        null,
        [firstMemberId, secondMemberId, callerId],
        null,
      ),
    );

    expect(result.conversation.kind).toBe(ConversationKind.GROUP);
    expect(result.conversation.title?.value).toBe(
      'Creator, Member One, Member Two',
    );
    expect(result.members).toHaveLength(3);
    expect(result.members[0].role).toBe('admin');
    expect(result.members.slice(1).map((member) => member.role)).toEqual([
      'member',
      'member',
    ]);
    expect(conversations.save).toHaveBeenCalledTimes(1);
    expect(members.save).toHaveBeenCalledTimes(3);
    expect(order).toEqual([
      'conversation-saved',
      'member-saved',
      'member-saved',
      'member-saved',
      'committed',
      `activated:${callerId}`,
      `activated:${firstMemberId}`,
      `activated:${secondMemberId}`,
    ]);
  });

  it('rejects a group with fewer than two distinct members before looking up users', async () => {
    const callerId = generateUuid();
    const userLookup: ConversationUserLookup = {
      findDisplayNames: jest.fn(),
    };
    const unitOfWork: IUnitOfWork = { run: jest.fn() };
    const handler = new ConversationCreateCommandHandler(
      {} as ConversationRepository,
      {} as ConversationMemberRepository,
      {} as MessageRepository,
      unitOfWork,
      userLookup,
      {
        membershipActivated: jest.fn(),
        messageCreated: jest.fn(),
        messageReceived: jest.fn(),
        readUpdated: jest.fn(),
        memberReadUpdated: jest.fn(),
        membershipRevoked: jest.fn(),
      },
    );

    await expect(
      handler.execute(
        new ConversationCreateCommand(
          ConversationKind.GROUP,
          callerId,
          null,
          [callerId, callerId],
          null,
        ),
      ),
    ).rejects.toThrow(ConversationGroupMembersInsufficientException);
    expect(userLookup.findDisplayNames).not.toHaveBeenCalled();
    expect(unitOfWork.run).not.toHaveBeenCalled();
  });
});
