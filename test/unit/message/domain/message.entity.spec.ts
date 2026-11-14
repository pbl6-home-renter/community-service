import { MessageEntity } from 'modules/message/domain/entities/message.entity';
import { MessageType } from 'modules/message/domain/enums/message-type.enum';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

function message(sequence: string) {
  return MessageEntity.create({
    conversationId: generateUuid(),
    senderMemberId: generateUuid(),
    senderNameSnapshot: 'Tenant One',
    type: MessageType.TEXT,
    content: 'Hello',
    sequence,
  });
}

describe('MessageEntity', () => {
  it('accepts large positive sequences without converting them to floating point', () => {
    const item = message('9007199254740993');

    expect(item.sequence).toBe('9007199254740993');
  });

  it.each(['0', '-1', '1.5', '9223372036854775808'])(
    'rejects invalid sequence %s',
    (sequence) => {
      expect(() => message(sequence)).toThrow(ValidationException);
    },
  );

  it('rejects an empty sender snapshot', () => {
    expect(() =>
      MessageEntity.create({
        conversationId: generateUuid(),
        senderMemberId: generateUuid(),
        senderNameSnapshot: '   ',
        type: MessageType.TEXT,
        content: 'Hello',
        sequence: '1',
      }),
    ).toThrow(ValidationException);
  });
});
