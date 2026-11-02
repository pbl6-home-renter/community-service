import { AggregateRoot } from 'shared/domain/base/aggregate-root';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { Uuid, generateUuid } from 'shared/domain/value-objects/uuid.vo';
import { MessageProps } from './message.props';
import { MessageType } from '../enums/message-type.enum';

export class MessageEntity extends AggregateRoot {
  private constructor(
    id: Uuid,
    readonly conversationId: Uuid,
    readonly senderMemberId: Uuid,
    readonly clientMessageId: Uuid | null,
    readonly type: MessageType,
    readonly content: string | null,
    readonly mediaId: Uuid | null,
    readonly payload: Record<string, unknown> | null,
    readonly sequence: string,
    createdAt: Date,
    updatedAt: Date,
    isDeleted: boolean,
  ) {
    super(id, createdAt, updatedAt, isDeleted);
  }

  static create(props: MessageProps): MessageEntity {
    return MessageEntity.reconstitute(props);
  }

  static reconstitute(props: MessageProps): MessageEntity {
    MessageEntity.validateSequence(props.sequence);
    MessageEntity.validateType(props.type);

    return new MessageEntity(
      props.id ?? generateUuid(),
      props.conversationId,
      props.senderMemberId,
      props.clientMessageId ?? null,
      props.type,
      props.content ?? null,
      props.mediaId ?? null,
      props.payload ?? null,
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
