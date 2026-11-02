import { AggregateRoot } from 'shared/domain/base/aggregate-root';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { Uuid, generateUuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationMemberProps } from './conversation-member.props';
import { ConversationMemberRole } from '../enums/conversation-member-role.enum';
import { ConversationMemberStatus } from '../enums/conversation-member-status.enum';
import { ConversationParticipantType } from '../enums/conversation-participant-type.enum';

export class ConversationMemberEntity extends AggregateRoot {
  private _joinedAt: Date;
  private _leftAt: Date | null;
  private _leftSequence: string | null;
  private _lastReadSequence: string;
  private _status: ConversationMemberStatus;

  private constructor(
    id: Uuid,
    readonly conversationId: Uuid,
    readonly participantType: ConversationParticipantType,
    readonly userId: Uuid | null,
    private _displayName: string,
    readonly systemParticipantKey: string | null,
    readonly role: ConversationMemberRole,
    status: ConversationMemberStatus,
    joinedAt: Date,
    leftAt: Date | null,
    leftSequence: string | null,
    lastReadSequence: string,
    createdAt: Date,
    updatedAt: Date,
    isDeleted: boolean,
  ) {
    super(id, createdAt, updatedAt, isDeleted);
    this._status = status;
    this._joinedAt = joinedAt;
    this._leftAt = leftAt;
    this._leftSequence = leftSequence;
    this._lastReadSequence = lastReadSequence;
  }

  static create(props: ConversationMemberProps): ConversationMemberEntity {
    return ConversationMemberEntity.reconstitute(props);
  }

  static reconstitute(
    props: ConversationMemberProps,
  ): ConversationMemberEntity {
    ConversationMemberEntity.validateDisplayName(props.displayName);
    const status = props.status ?? ConversationMemberStatus.ACTIVE;
    const leftAt = props.leftAt ?? null;
    const leftSequence = props.leftSequence ?? null;
    const lastReadSequence = props.lastReadSequence ?? '0';

    ConversationMemberEntity.validateState(
      status,
      leftAt,
      leftSequence,
      lastReadSequence,
    );

    return new ConversationMemberEntity(
      props.id ?? generateUuid(),
      props.conversationId,
      props.participantType,
      props.participantType === ConversationParticipantType.USER
        ? props.userId
        : null,
      props.displayName,
      props.participantType === ConversationParticipantType.SYSTEM
        ? props.systemParticipantKey
        : null,
      props.role,
      status,
      props.joinedAt ?? new Date(),
      leftAt,
      leftSequence,
      lastReadSequence,
      props.createdAt ?? new Date(),
      props.updatedAt ?? new Date(),
      props.isDeleted ?? false,
    );
  }

  get status(): ConversationMemberStatus {
    return this._status;
  }

  get displayName(): string {
    return this._displayName;
  }

  get joinedAt(): Date {
    return this._joinedAt;
  }

  get leftAt(): Date | null {
    return this._leftAt;
  }

  get leftSequence(): string | null {
    return this._leftSequence;
  }

  get lastReadSequence(): string {
    return this._lastReadSequence;
  }

  markReadOnly(leftAt: Date, leftSequence: string): void {
    if (this._status === ConversationMemberStatus.READ_ONLY) return;

    ConversationMemberEntity.validateSequence(leftSequence);
    this._status = ConversationMemberStatus.READ_ONLY;
    this._leftAt = leftAt;
    this._leftSequence = leftSequence;
  }

  reactivate(
    joinedAt: Date,
    latestSequence: string,
    displayName: string,
  ): void {
    if (this._status === ConversationMemberStatus.ACTIVE) return;

    ConversationMemberEntity.validateDisplayName(displayName);
    ConversationMemberEntity.validateSequence(latestSequence);
    this._status = ConversationMemberStatus.ACTIVE;
    this._joinedAt = joinedAt;
    this._leftAt = null;
    this._leftSequence = null;
    this._lastReadSequence = latestSequence;
    this._displayName = displayName;
  }

  private static validateState(
    status: ConversationMemberStatus,
    leftAt: Date | null,
    leftSequence: string | null,
    lastReadSequence: string,
  ): void {
    const hasLeaveBoundary = leftAt !== null && leftSequence !== null;

    if (
      (status === ConversationMemberStatus.ACTIVE &&
        (leftAt !== null || leftSequence !== null)) ||
      (status === ConversationMemberStatus.READ_ONLY && !hasLeaveBoundary)
    ) {
      throw new ValidationException(
        'Conversation member status and leave boundary do not match',
      );
    }

    ConversationMemberEntity.validateSequence(lastReadSequence);
    if (leftSequence !== null) {
      ConversationMemberEntity.validateSequence(leftSequence);
    }
  }

  private static validateSequence(sequence: string): void {
    if (!/^(0|[1-9]\d*)$/.test(sequence)) {
      throw new ValidationException(
        'Conversation member sequence must be a non-negative integer',
      );
    }

    if (BigInt(sequence) > 9223372036854775807n) {
      throw new ValidationException(
        'Conversation member sequence exceeds the supported range',
      );
    }
  }

  private static validateDisplayName(displayName: string): void {
    if (
      typeof displayName !== 'string' ||
      displayName.trim().length === 0 ||
      displayName.length > 254
    ) {
      throw new ValidationException(
        'Conversation member display name is invalid',
      );
    }
  }
}
