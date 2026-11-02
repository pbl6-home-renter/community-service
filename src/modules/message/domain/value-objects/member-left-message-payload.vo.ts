import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { Uuid, isValidUuid } from 'shared/domain/value-objects/uuid.vo';
import {
  ConversationMemberSnapshot,
  MemberLeftMessagePayloadData,
} from '../types/message-payload.type';

export class MemberLeftMessagePayload {
  private constructor(
    readonly actorUserId: Uuid,
    readonly member: Readonly<ConversationMemberSnapshot>,
  ) {}

  static create(
    actorUserId: Uuid,
    member: ConversationMemberSnapshot,
  ): MemberLeftMessagePayload {
    if (actorUserId.toLowerCase() !== member.userId.toLowerCase()) {
      throw new ValidationException(
        'A member-left message actor must be the member who left',
      );
    }
    if (
      !isValidUuid(actorUserId) ||
      !isValidUuid(member.userId) ||
      typeof member.displayName !== 'string' ||
      member.displayName.trim().length === 0 ||
      member.displayName.length > 254
    ) {
      throw new ValidationException('System message member data is invalid');
    }
    return new MemberLeftMessagePayload(
      actorUserId,
      Object.freeze({ ...member }),
    );
  }

  toJSON(): MemberLeftMessagePayloadData {
    return {
      action: 'member_left',
      actorUserId: this.actorUserId,
      member: { ...this.member },
    };
  }
}
