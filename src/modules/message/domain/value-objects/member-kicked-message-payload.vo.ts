import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { Uuid, isValidUuid } from 'shared/domain/value-objects/uuid.vo';
import {
  ConversationMemberSnapshot,
  MemberKickedMessagePayloadData,
} from '../types/message-payload.type';
import { isValidSystemMessageActorName } from '../validation/system-message-actor.validation';

export class MemberKickedMessagePayload {
  private constructor(
    readonly actorUserId: Uuid,
    readonly actorDisplayName: string,
    readonly member: Readonly<ConversationMemberSnapshot>,
  ) {}

  static create(
    actorUserId: Uuid,
    actorDisplayName: string,
    member: ConversationMemberSnapshot,
  ): MemberKickedMessagePayload {
    if (
      !isValidUuid(actorUserId) ||
      !isValidSystemMessageActorName(actorDisplayName) ||
      !isValidUuid(member.userId) ||
      typeof member.displayName !== 'string' ||
      member.displayName.trim().length === 0 ||
      member.displayName.length > 254
    ) {
      throw new ValidationException('System message member data is invalid');
    }
    return new MemberKickedMessagePayload(
      actorUserId,
      actorDisplayName,
      Object.freeze({ ...member }),
    );
  }

  toJSON(): MemberKickedMessagePayloadData {
    return {
      action: 'member_kicked',
      actorUserId: this.actorUserId,
      actorDisplayName: this.actorDisplayName,
      member: { ...this.member },
    };
  }
}
