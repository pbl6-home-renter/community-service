import { AggregateRoot } from 'shared/domain/base/aggregate-root';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { Uuid, generateUuid } from 'shared/domain/value-objects/uuid.vo';
import { MessageProps } from './message.props';
import { MessageType } from '../enums/message-type.enum';
import { MessagePayload } from '../types/message-payload.type';
import { MediaReference } from 'modules/media/domain/value-objects/media-reference.vo';
import { isContentMessageType } from '../constants/content-message-types.constant';
import { MessageReplyTargetInvalidException } from '../exceptions/message-reply-target-invalid.exception';

const CONTENT_PREVIEW_MAX_LENGTH = 120;

export class MessageEntity extends AggregateRoot {
  private readonly _media: MediaReference | null;

  private constructor(
    id: Uuid,
    readonly conversationId: Uuid,
    readonly senderMemberId: Uuid,
    readonly senderNameSnapshot: string,
    readonly clientMessageId: Uuid | null,
    readonly type: MessageType,
    readonly content: string | null,
    mediaId: Uuid | null,
    readonly payload: MessagePayload | null,
    readonly replyToMessageId: Uuid | null,
    readonly sequence: string,
    createdAt: Date,
    updatedAt: Date,
    isDeleted: boolean,
  ) {
    super(id, createdAt, updatedAt, isDeleted);
    this._media = mediaId === null ? null : MediaReference.create(mediaId);
  }

  get mediaId(): Uuid | null {
    return this._media?.mediaId ?? null;
  }

  /** Text/bot content or image caption, at most 120 characters. */
  get contentPreview(): string {
    const content = this.content ?? '';
    return content.length <= CONTENT_PREVIEW_MAX_LENGTH
      ? content
      : `${content.slice(0, CONTENT_PREVIEW_MAX_LENGTH - 3)}...`;
  }

  /** A reply may only quote a live text/image/bot message of the same conversation. */
  assertReplyableIn(conversationId: Uuid): void {
    if (
      this.isDeleted ||
      this.conversationId.toLowerCase() !== conversationId.toLowerCase() ||
      !isContentMessageType(this.type)
    ) {
      throw new MessageReplyTargetInvalidException();
    }
  }

  static create(props: MessageProps): MessageEntity {
    return MessageEntity.reconstitute(props);
  }

  static reconstitute(props: MessageProps): MessageEntity {
    MessageEntity.validateSequence(props.sequence);
    MessageEntity.validateType(props.type);
    MessageEntity.validateSenderNameSnapshot(props.senderNameSnapshot);

    return new MessageEntity(
      props.id ?? generateUuid(),
      props.conversationId,
      props.senderMemberId,
      props.senderNameSnapshot,
      props.clientMessageId ?? null,
      props.type,
      props.content ?? null,
      props.mediaId ?? null,
      props.payload ?? null,
      props.replyToMessageId ?? null,
      props.sequence,
      props.createdAt ?? new Date(),
      props.updatedAt ?? new Date(),
      props.isDeleted ?? false,
    );
  }

  private static validateType(type: MessageType): void {
    if (!Object.values(MessageType).includes(type)) {
      throw new ValidationException('Message type is invalid');
    }
  }

  private static validateSenderNameSnapshot(senderNameSnapshot: string): void {
    if (
      typeof senderNameSnapshot !== 'string' ||
      senderNameSnapshot.trim().length === 0 ||
      senderNameSnapshot.length > 254
    ) {
      throw new ValidationException('Message sender name snapshot is invalid');
    }
  }

  private static validateSequence(sequence: string): void {
    if (!/^[1-9]\d*$/.test(sequence)) {
      throw new ValidationException(
        'Message sequence must be a positive integer',
      );
    }

    if (BigInt(sequence) > 9223372036854775807n) {
      throw new ValidationException(
        'Message sequence exceeds the supported range',
      );
    }
  }
}
