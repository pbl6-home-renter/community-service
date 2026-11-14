import { MessageListQuery } from 'modules/message/application/queries/message-list/message-list.query';
import { MessageListQueryHandler } from 'modules/message/application/queries/message-list/message-list.query.handler';
import { MessageSearchQuery } from 'modules/message/application/queries/message-search/message-search.query';
import { MessageSearchQueryHandler } from 'modules/message/application/queries/message-search/message-search.query.handler';
import { MessagePageQueryPort } from 'modules/message/application/ports/message-page-query.port';
import { MessageConversationNotFoundException } from 'modules/message/domain/exceptions/message-conversation-not-found.exception';
import { ConversationEntity } from 'modules/conversation/domain/entities/conversation.entity';
import { ConversationRepository } from 'modules/conversation/domain/repositories/conversation.repository';
import { ConversationKind } from 'modules/conversation/domain/enums/conversation-kind.enum';
import { ConversationTitle } from 'modules/conversation/domain/value-objects/conversation-title.vo';
import { ConversationForbiddenException } from 'modules/conversation/domain/exceptions/conversation-forbidden.exception';
import { ConversationMemberEntity } from 'modules/conversation-member/domain/entities/conversation-member.entity';
import { ConversationMemberRepository } from 'modules/conversation-member/domain/repositories/conversation-member.repository';
import { ConversationMemberRole } from 'modules/conversation-member/domain/enums/conversation-member-role.enum';
import { ConversationParticipantType } from 'modules/conversation-member/domain/enums/conversation-participant-type.enum';
import { generateUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';

const EMPTY_PAGE = {
  data: [],
  pagination: {
    type: 'cursor' as const,
    pageSize: 30,
    nextCursor: null,
    hasNextPage: false,
  },
};

function setup(
  conversation: ConversationEntity | null,
  member: ConversationMemberEntity | null,
) {
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
    findActiveUserMembersForUpdate: jest.fn(async () => []),
    findActiveUserMembers: jest.fn(async () => []),
  };
  const pageQuery: MessagePageQueryPort = {
    findPage: jest.fn(async () => EMPTY_PAGE),
    search: jest.fn(async () => EMPTY_PAGE),
  };
  return {
    list: new MessageListQueryHandler(conversations, members, pageQuery),
    search: new MessageSearchQueryHandler(conversations, members, pageQuery),
    pageQuery,
  };
}

function conversationWithMember(leftSequence?: string) {
  const conversation = ConversationEntity.create({
    kind: ConversationKind.GROUP,
    title: ConversationTitle.create('Tòa A'),
  });
  const member = ConversationMemberEntity.create({
    conversationId: conversation.id,
    participantType: ConversationParticipantType.USER,
    userId: generateUuid(),
    displayName: 'Tenant',
    role: ConversationMemberRole.MEMBER,
  });
  if (leftSequence) member.markReadOnly(new Date(), leftSequence);
  return { conversation, member, userId: member.userId as Uuid };
}

describe('MessageListQueryHandler maxSequence', () => {
  it.each([
    ['an active member without maxSequence', undefined, null, null],
    ['an active member opening a message', undefined, '40', '40'],
    ['a read-only member without maxSequence', '30', null, '30'],
    ['a read-only member asking beyond leftSequence', '30', '40', '30'],
    ['a read-only member opening an older message', '30', '20', '20'],
  ])(
    'caps the page for %s',
    async (_case, leftSequence, maxSequence, expected) => {
      const { conversation, member, userId } =
        conversationWithMember(leftSequence);
      const { list, pageQuery } = setup(conversation, member);

      await list.execute(
        new MessageListQuery(
          conversation.id,
          userId,
          'cursor',
          30,
          maxSequence,
        ),
      );

      expect(pageQuery.findPage).toHaveBeenCalledWith({
        conversationId: conversation.id,
        actorUserId: userId,
        cursor: 'cursor',
        pageSize: 30,
        maxSequence: expected,
        afterSequence: null,
      });
    },
  );

  it('compares sequences numerically, not as strings', async () => {
    const { conversation, member, userId } = conversationWithMember('100');
    const { list, pageQuery } = setup(conversation, member);

    await list.execute(
      new MessageListQuery(conversation.id, userId, undefined, 30, '99'),
    );

    expect(pageQuery.findPage).toHaveBeenCalledWith(
      expect.objectContaining({ maxSequence: '99' }),
    );
  });

  it('keeps the read-only boundary while loading newer messages after an anchor', async () => {
    const { conversation, member, userId } = conversationWithMember('50');
    const { list, pageQuery } = setup(conversation, member);

    await list.execute(
      new MessageListQuery(conversation.id, userId, undefined, 30, null, '40'),
    );

    expect(pageQuery.findPage).toHaveBeenCalledWith(
      expect.objectContaining({ afterSequence: '40', maxSequence: '50' }),
    );
  });
});

describe('MessageSearchQueryHandler', () => {
  it('searches within the conversation for a member', async () => {
    const { conversation, member, userId } = conversationWithMember();
    const { search, pageQuery } = setup(conversation, member);

    await search.execute(
      new MessageSearchQuery(conversation.id, userId, 'vòi xịt', undefined, 20),
    );

    expect(pageQuery.search).toHaveBeenCalledWith({
      conversationId: conversation.id,
      actorUserId: userId,
      keyword: 'vòi xịt',
      cursor: undefined,
      pageSize: 20,
    });
  });

  it('forbids a user who is not a member', async () => {
    const { conversation } = conversationWithMember();
    const { search, pageQuery } = setup(conversation, null);

    await expect(
      search.execute(
        new MessageSearchQuery(
          conversation.id,
          generateUuid(),
          'ab',
          undefined,
          20,
        ),
      ),
    ).rejects.toThrow(ConversationForbiddenException);
    expect(pageQuery.search).not.toHaveBeenCalled();
  });

  it('reports a missing conversation', async () => {
    const { search, pageQuery } = setup(null, null);

    await expect(
      search.execute(
        new MessageSearchQuery(
          generateUuid(),
          generateUuid(),
          'ab',
          undefined,
          20,
        ),
      ),
    ).rejects.toThrow(MessageConversationNotFoundException);
    expect(pageQuery.search).not.toHaveBeenCalled();
  });
});
