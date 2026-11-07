import { AggregateRoot } from 'shared/domain/base/aggregate-root';
import { Uuid, generateUuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationContextType } from '../enums/conversation-context-type.enum';
import { ConversationKind } from '../enums/conversation-kind.enum';
import { ConversationTitle } from '../value-objects/conversation-title.vo';
import { ConversationProps } from './conversation.props';
import { MediaReference } from 'modules/media/domain/value-objects/media-reference.vo';

export class ConversationEntity extends AggregateRoot {
  private readonly _avatar: MediaReference | null;

  private constructor(
    id: Uuid,
    readonly kind: ConversationKind,
    readonly contextType: ConversationContextType | null,
    readonly contextId: Uuid | null,
    readonly directPairKey: string | null,
    readonly title: ConversationTitle | null,
    avatarMediaId: Uuid | null,
    readonly createdByUserId: Uuid | null,
    createdAt: Date,
    updatedAt: Date,
    isDeleted: boolean,
  ) {
    super(id, createdAt, updatedAt, isDeleted);
    this._avatar = avatarMediaId === null ? null : MediaReference.create(avatarMediaId);
  }

  get avatarMediaId(): Uuid | null {
    return this._avatar?.mediaId ?? null;
  }

  static create(props: ConversationProps): ConversationEntity {
    return ConversationEntity.reconstitute(props);
  }

  static reconstitute(props: ConversationProps): ConversationEntity {
    const contextType = props.contextType ?? null;
    const contextId = props.contextId ?? null;
    const directPairKey = props.directPairKey ?? null;

    if ((contextType === null) !== (contextId === null)) {
      throw new Error('Conversation context type and ID must be set together');
    }

    if (
      (props.kind === ConversationKind.DIRECT && directPairKey === null) ||
      (props.kind === ConversationKind.GROUP && directPairKey !== null)
    ) {
      throw new Error('Conversation kind and direct pair key do not match');
    }

    return new ConversationEntity(
      props.id ?? generateUuid(),
      props.kind,
      contextType,
      contextId,
      directPairKey,
      props.title ?? null,
      props.avatarMediaId ?? null,
      props.createdByUserId ?? null,
      props.createdAt ?? new Date(),
      props.updatedAt ?? new Date(),
      props.isDeleted ?? false,
    );
  }

  withGroupMetadata(
    title: ConversationTitle | null,
    avatarMediaId: Uuid | null,
  ): ConversationEntity {
    return ConversationEntity.reconstitute({
      id: this.id,
      kind: this.kind,
      contextType: this.contextType,
      contextId: this.contextId,
      directPairKey: this.directPairKey,
      title,
      avatarMediaId,
      createdByUserId: this.createdByUserId,
      createdAt: this.createdAt,
      updatedAt: new Date(),
      isDeleted: this.isDeleted,
    });
  }
}
