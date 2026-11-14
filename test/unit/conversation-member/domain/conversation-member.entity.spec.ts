import { ConversationMemberEntity } from 'modules/conversation-member/domain/entities/conversation-member.entity';
import { ConversationMemberRole } from 'modules/conversation-member/domain/enums/conversation-member-role.enum';
import { ConversationMemberStatus } from 'modules/conversation-member/domain/enums/conversation-member-status.enum';
import { ConversationParticipantType } from 'modules/conversation-member/domain/enums/conversation-participant-type.enum';
import { ConversationMemberReadCursorInvalidException } from 'modules/conversation-member/domain/exceptions/conversation-member-read-cursor-invalid.exception';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

function createMember() {
  return ConversationMemberEntity.create({
    conversationId: generateUuid(),
    participantType: ConversationParticipantType.USER,
    userId: generateUuid(),
    displayName: 'Tenant One',
    role: ConversationMemberRole.MEMBER,
    lastReadSequence: '10',
  });
}

describe('ConversationMemberEntity', () => {
  it('advances its read cursor monotonically and treats the same cursor as a no-op', () => {
    const member = createMember();

    expect(member.markRead('10')).toBe(false);
    expect(member.markRead('12')).toBe(true);
    expect(member.lastReadSequence).toBe('12');
    expect(() => member.markRead('11')).toThrow(
      ConversationMemberReadCursorInvalidException,
    );
  });

  it('marks a member read-only and resets leave state on reactivation', () => {
    const member = createMember();
    const leftAt = new Date('2026-11-01T00:00:00.000Z');

    member.markReadOnly(leftAt, '20');
    expect(member.status).toBe(ConversationMemberStatus.READ_ONLY);
    expect(member.leftSequence).toBe('20');
    member.reactivate(new Date('2026-11-02T00:00:00.000Z'), '21', 'New name');

    expect(member.status).toBe(ConversationMemberStatus.ACTIVE);
    expect(member.leftAt).toBeNull();
    expect(member.leftSequence).toBeNull();
    expect(member.lastReadSequence).toBe('21');
    expect(member.displayName).toBe('New name');
  });

  it('rejects invalid read-only state and system-member role changes', () => {
    expect(() =>
      ConversationMemberEntity.reconstitute({
        conversationId: generateUuid(),
        participantType: ConversationParticipantType.USER,
        userId: generateUuid(),
        displayName: 'Tenant One',
        role: ConversationMemberRole.MEMBER,
        status: ConversationMemberStatus.READ_ONLY,
      }),
    ).toThrow(ValidationException);

    const systemMember = ConversationMemberEntity.create({
      conversationId: generateUuid(),
      participantType: ConversationParticipantType.SYSTEM,
      systemParticipantKey: 'system:admin',
      displayName: 'System',
      role: ConversationMemberRole.SYSTEM,
    });
    expect(() => systemMember.changeRole(ConversationMemberRole.ADMIN)).toThrow(
      ValidationException,
    );
  });
});
