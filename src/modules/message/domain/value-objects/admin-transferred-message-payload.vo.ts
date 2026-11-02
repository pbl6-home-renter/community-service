import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { Uuid, isValidUuid } from 'shared/domain/value-objects/uuid.vo';
import {
  AdminTransferredMessagePayloadData,
  ConversationMemberSnapshot,
} from '../types/message-payload.type';

export class AdminTransferredMessagePayload {
  private constructor(
    readonly actorUserId: Uuid,
    readonly member: Readonly<ConversationMemberSnapshot>,
  ) {}

  static create(
    actorUserId: Uuid,
    member: ConversationMemberSnapshot,
  ): AdminTransferredMessagePayload {
    if (
      !isValidUuid(actorUserId) ||
      !isValidUuid(member.userId) ||
      typeof member.displayName !== 'string' ||
      member.displayName.trim().length === 0 ||
      member.displayName.length > 254
    ) {
      throw new ValidationException('System message member data is invalid');
    }
    return new AdminTransferredMessagePayload(
      actorUserId,
      Object.freeze({ ...member }),
    );
  }

  toJSON(): AdminTransferredMessagePayloadData {
    return {
      action: 'admin_transferred',
      actorUserId: this.actorUserId,
      member: { ...this.member },
    };
  }
}
