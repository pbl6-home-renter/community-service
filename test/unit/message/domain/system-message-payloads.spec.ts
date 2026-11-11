import { AdminTransferredMessagePayload } from 'modules/message/domain/value-objects/admin-transferred-message-payload.vo';
import { ConversationAvatarChangedMessagePayload } from 'modules/message/domain/value-objects/conversation-avatar-changed-message-payload.vo';
import { ConversationTitleChangedMessagePayload } from 'modules/message/domain/value-objects/conversation-title-changed-message-payload.vo';
import { MemberKickedMessagePayload } from 'modules/message/domain/value-objects/member-kicked-message-payload.vo';
import { MemberLeftMessagePayload } from 'modules/message/domain/value-objects/member-left-message-payload.vo';
import { MemberRoleChangedMessagePayload } from 'modules/message/domain/value-objects/member-role-changed-message-payload.vo';
import { MembersAddedMessagePayload } from 'modules/message/domain/value-objects/members-added-message-payload.vo';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

describe('system message payload value objects', () => {
  it('serializes copied member snapshots and keeps members-added identities unique', () => {
    const actorUserId = generateUuid();
    const member = { userId: generateUuid(), displayName: 'New member' };
    const payload = MembersAddedMessagePayload.create({
      actorUserId,
      actorDisplayName: 'Admin',
      members: [member],
    });
    member.displayName = 'Changed after creation';

    expect(payload.toJSON()).toEqual({
      action: 'members_added',
      actorUserId,
      actorDisplayName: 'Admin',
      members: [
        { userId: payload.members[0].userId, displayName: 'New member' },
      ],
    });
    expect(() =>
      MembersAddedMessagePayload.create({
        actorUserId,
        actorDisplayName: 'Admin',
        members: [payload.members[0], payload.members[0]],
      }),
    ).toThrow(ValidationException);
  });

  it('requires a member-left actor to match the member and allows kicked snapshots', () => {
    const actorUserId = generateUuid();
    const member = { userId: generateUuid(), displayName: 'Member' };

    expect(() =>
      MemberLeftMessagePayload.create(actorUserId, 'Member', member),
    ).toThrow(ValidationException);
    expect(
      MemberKickedMessagePayload.create(actorUserId, 'Admin', member).toJSON()
        .action,
    ).toBe('member_kicked');
  });

  it('validates role changes and snapshots for admin transfer', () => {
    const actorUserId = generateUuid();
    const member = { userId: generateUuid(), displayName: 'Member' };

    expect(
      MemberRoleChangedMessagePayload.create(
        actorUserId,
        'Admin',
        member,
        'member',
        'admin',
      ).toJSON().newRole,
    ).toBe('admin');
    expect(() =>
      MemberRoleChangedMessagePayload.create(
        actorUserId,
        'Admin',
        member,
        'admin',
        'admin',
      ),
    ).toThrow(ValidationException);
    expect(
      AdminTransferredMessagePayload.create(
        actorUserId,
        'Admin',
        member,
      ).toJSON().member,
    ).toEqual(member);
  });

  it('serializes title and avatar transitions, including clearing an avatar', () => {
    const actorUserId = generateUuid();
    const oldAvatarMediaId = generateUuid();

    expect(
      ConversationTitleChangedMessagePayload.create(
        actorUserId,
        'Admin',
        'Old title',
        'New title',
      ).toJSON().newTitle,
    ).toBe('New title');
    expect(
      ConversationAvatarChangedMessagePayload.create(
        actorUserId,
        'Admin',
        oldAvatarMediaId,
        null,
      ).toJSON(),
    ).toEqual({
      action: 'conversation_avatar_changed',
      actorUserId,
      actorDisplayName: 'Admin',
      oldAvatarMediaId,
      newAvatarMediaId: null,
    });
  });
});
