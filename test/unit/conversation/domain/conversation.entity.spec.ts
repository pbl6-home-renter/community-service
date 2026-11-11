import { ConversationEntity } from 'modules/conversation/domain/entities/conversation.entity';
import { ConversationKind } from 'modules/conversation/domain/enums/conversation-kind.enum';
import { ConversationContextType } from 'modules/conversation/domain/enums/conversation-context-type.enum';
import { ConversationTitle } from 'modules/conversation/domain/value-objects/conversation-title.vo';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

describe('ConversationTitle', () => {
  it('trims titles and builds a bounded Unicode-safe group title', () => {
    expect(ConversationTitle.create('  Repair request  ').value).toBe(
      'Repair request',
    );
    const title = ConversationTitle.fromMemberNames([
      'A'.repeat(250),
      'Tenant 😀',
    ]);

    expect(title.value.length).toBeLessThanOrEqual(255);
    expect(title.value.endsWith('…')).toBe(true);
    expect(() => ConversationTitle.fromMemberNames([])).toThrow(
      ValidationException,
    );
  });
});

describe('ConversationEntity', () => {
  it('requires a context type and id to be supplied together', () => {
    expect(() =>
      ConversationEntity.create({
        kind: ConversationKind.GROUP,
        contextType: ConversationContextType.BUILDING,
      }),
    ).toThrow('Conversation context type and ID must be set together');
  });

  it('enforces direct-pair keys and returns a new group metadata snapshot', () => {
    expect(() =>
      ConversationEntity.create({ kind: ConversationKind.DIRECT }),
    ).toThrow('Conversation kind and direct pair key do not match');

    const conversation = ConversationEntity.create({
      kind: ConversationKind.GROUP,
      contextType: ConversationContextType.CONTRACT,
      contextId: generateUuid(),
      title: ConversationTitle.create('Original'),
    });
    const changed = conversation.withGroupMetadata(
      ConversationTitle.create('Updated'),
      generateUuid(),
    );

    expect(conversation.title?.value).toBe('Original');
    expect(changed.title?.value).toBe('Updated');
    expect(changed.id).toBe(conversation.id);
  });
});
