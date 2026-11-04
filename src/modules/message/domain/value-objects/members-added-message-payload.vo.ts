import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { Uuid, isValidUuid } from 'shared/domain/value-objects/uuid.vo';
import { MembersAddedMessagePayloadData } from '../types/message-payload.type';
import { isValidSystemMessageActorName } from '../validation/system-message-actor.validation';

export interface AddedMessageMemberSnapshot {
  userId: Uuid;
  displayName: string;
}

export interface MembersAddedMessagePayloadProps {
  actorUserId: Uuid;
  actorDisplayName: string;
  members: AddedMessageMemberSnapshot[];
}

export class MembersAddedMessagePayload {
  private readonly _members: ReadonlyArray<
    Readonly<AddedMessageMemberSnapshot>
  >;

  private constructor(
    readonly actorUserId: Uuid,
    readonly actorDisplayName: string,
    members: AddedMessageMemberSnapshot[],
  ) {
    this._members = members.map((member) => Object.freeze({ ...member }));
  }

  static create(
    props: MembersAddedMessagePayloadProps,
  ): MembersAddedMessagePayload {
    if (
      !isValidUuid(props.actorUserId) ||
      !isValidSystemMessageActorName(props.actorDisplayName)
    ) {
      throw new ValidationException('System message actor user ID is invalid');
    }
    if (!Array.isArray(props.members) || props.members.length === 0) {
      throw new ValidationException(
        'System message must include at least one added member',
      );
    }

    const memberIds = new Set<string>();
    for (const member of props.members) {
      if (!isValidUuid(member.userId)) {
        throw new ValidationException(
          'System message member user ID is invalid',
        );
      }
      if (memberIds.has(member.userId.toLowerCase())) {
        throw new ValidationException(
          'System message member user IDs must be unique',
        );
      }
      if (
        typeof member.displayName !== 'string' ||
        member.displayName.trim().length === 0 ||
        member.displayName.length > 254
      ) {
        throw new ValidationException(
          'System message member display name is invalid',
        );
      }
      memberIds.add(member.userId.toLowerCase());
    }

    return new MembersAddedMessagePayload(
      props.actorUserId,
      props.actorDisplayName,
      props.members,
    );
  }

  get members(): AddedMessageMemberSnapshot[] {
    return this._members.map((member) => ({ ...member }));
  }

  toJSON(): MembersAddedMessagePayloadData {
    return {
      action: 'members_added',
      actorUserId: this.actorUserId,
      actorDisplayName: this.actorDisplayName,
      members: this.members,
    };
  }
}
