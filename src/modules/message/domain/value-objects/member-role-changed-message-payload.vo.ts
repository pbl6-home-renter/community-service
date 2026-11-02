import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { Uuid, isValidUuid } from 'shared/domain/value-objects/uuid.vo';
import {
  ConversationMemberSnapshot,
  ConversationMemberRoleValue,
  MemberRoleChangedMessagePayloadData,
} from '../types/message-payload.type';

export class MemberRoleChangedMessagePayload {
  private constructor(
    readonly actorUserId: Uuid,
    readonly member: Readonly<ConversationMemberSnapshot>,
    readonly oldRole: ConversationMemberRoleValue,
    readonly newRole: ConversationMemberRoleValue,
  ) {}

  static create(
    actorUserId: Uuid,
    member: ConversationMemberSnapshot,
    oldRole: ConversationMemberRoleValue,
    newRole: ConversationMemberRoleValue,
  ): MemberRoleChangedMessagePayload {
    if (
      !isValidUuid(actorUserId) ||
      !isValidUuid(member.userId) ||
      typeof member.displayName !== 'string' ||
      member.displayName.trim().length === 0 ||
      member.displayName.length > 254 ||
      !isUserRole(oldRole) ||
      !isUserRole(newRole) ||
      oldRole === newRole
    ) {
      throw new ValidationException(
        'System message role-change data is invalid',
      );
    }
    return new MemberRoleChangedMessagePayload(
      actorUserId,
      Object.freeze({ ...member }),
      oldRole,
      newRole,
    );
  }

  toJSON(): MemberRoleChangedMessagePayloadData {
    return {
      action: 'member_role_changed',
      actorUserId: this.actorUserId,
      member: { ...this.member },
      oldRole: this.oldRole,
      newRole: this.newRole,
    };
  }
}

function isUserRole(role: string): role is ConversationMemberRoleValue {
  return role === 'admin' || role === 'member';
}
