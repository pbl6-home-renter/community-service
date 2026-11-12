import { MessageEntity } from 'modules/message/domain/entities/message.entity';
import { MessageType } from 'modules/message/domain/enums/message-type.enum';
import { MessageReplyTargetInvalidException } from 'modules/message/domain/exceptions/message-reply-target-invalid.exception';
import { MessageReplyReference } from 'modules/message/domain/value-objects/message-reply-reference.vo';
import { generateUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';

const conversationId = generateUuid();

function message(
  overrides: Partial<Parameters<typeof MessageEntity.create>[0]> = {},
) {
  return MessageEntity.create({
    conversationId,
    senderMemberId: generateUuid(),
    senderNameSnapshot: 'Tenant One',
    type: MessageType.TEXT,
    content: 'Hello',
    sequence: '3',
    ...overrides,
  });
}

describe('MessageEntity replies', () => {
  it('accepts a live text, image or bot message of the same conversation', () => {
    for (const type of [MessageType.TEXT, MessageType.IMAGE, MessageType.BOT]) {
      expect(() =>
        message({ type }).assertReplyableIn(
          conversationId.toUpperCase() as Uuid,
        ),
      ).not.toThrow();
    }
  });

  it.each([
    ['another conversation', message({ conversationId: generateUuid() })],
    ['a system message', message({ type: MessageType.SYSTEM, content: null })],
    ['a deleted message', message({ isDeleted: true })],
  ])('rejects %s', (_case, target) => {
    expect(() => target.assertReplyableIn(conversationId)).toThrow(
      MessageReplyTargetInvalidException,
    );
  });

  it('truncates the preview to 120 characters and uses the caption for images', () => {
    const long = 'a'.repeat(130);

    expect(message({ content: long }).contentPreview).toBe(
      `${'a'.repeat(117)}...`,
    );
    expect(message({ content: 'b'.repeat(120) }).contentPreview).toHaveLength(
      120,
    );
    expect(
      message({ type: MessageType.IMAGE, content: null }).contentPreview,
    ).toBe('');
  });
});

describe('MessageReplyReference', () => {
  it('exposes the original snapshot while it is available', () => {
    const original = message({ type: MessageType.IMAGE, content: 'Ảnh vòi' });

    expect(MessageReplyReference.of(original)).toEqual({
      id: original.id,
      senderName: 'Tenant One',
      type: MessageType.IMAGE,
      contentPreview: 'Ảnh vòi',
      isUnavailable: false,
    });
  });

  it('hides the content of a deleted original but keeps its id', () => {
    const original = message({ isDeleted: true, content: 'secret' });

    expect(MessageReplyReference.of(original)).toEqual({
      id: original.id,
      senderName: null,
      type: null,
      contentPreview: null,
      isUnavailable: true,
    });
  });
});
