import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { Uuid, isValidUuid } from 'shared/domain/value-objects/uuid.vo';
import {
  ConversationMemberSnapshot,
  MemberKickedMessagePayloadData,
} from '../types/message-payload.type';

export class MemberKickedMessagePayload {
  private constructor(
    readonly actorUserId: Uuid,
    readonly member: Readonly<ConversationMemberSnapshot>,
  ) {}

  static create(
    actorUserId: Uuid,
    member: ConversationMemberSnapshot,
  ): MemberKickedMessagePayload {
    if (
      !isValidUuid(actorUserId) ||
      !isValidUuid(member.userId) ||
      typeof member.displayName !== 'string' ||
      member.displayName.trim().length === 0 ||
      member.displayName.length > 254
    ) {
      throw new ValidationException('System message member data is invalid');
    }
    return new MemberKickedMessagePayload(
      actorUserId,
      Object.freeze({ ...member }),
    );
  }

  toJSON(): MemberKickedMessagePayloadData {
    return {
      action: 'member_kicked',
      actorUserId: this.actorUserId,
      member: { ...this.member },
    };
  }
}
