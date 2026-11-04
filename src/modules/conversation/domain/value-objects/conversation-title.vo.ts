import { ValidationException } from 'shared/domain/exceptions/validation.exception';

const MAX_TITLE_LENGTH = 255;
const DEFAULT_TITLE_SEPARATOR = ', ';
const TRUNCATION_MARK = '…';

export class ConversationTitle {
  private constructor(readonly value: string) {}

  static create(value: string): ConversationTitle {
    const normalizedValue = value.trim();

    if (
      normalizedValue.length === 0 ||
      normalizedValue.length > MAX_TITLE_LENGTH
    ) {
      throw new ValidationException(
        'Conversation title must contain between 1 and 255 characters',
      );
    }

    return new ConversationTitle(normalizedValue);
  }

  /**
   * Default group title built once from the initial members' snapshot names,
   * in the given order. Duplicate names are kept; overlong titles are cut.
   */
  static fromMemberNames(memberNames: string[]): ConversationTitle {
    const joined = memberNames
      .map((name) => name.trim())
      .filter((name) => name.length > 0)
      .join(DEFAULT_TITLE_SEPARATOR);
    if (joined.length <= MAX_TITLE_LENGTH) {
      return ConversationTitle.create(joined);
    }

    // Cut on code-point boundaries so a surrogate pair is never split.
    let truncated = '';
    for (const character of joined) {
      if (
        truncated.length + character.length >
        MAX_TITLE_LENGTH - TRUNCATION_MARK.length
      ) {
        break;
      }
      truncated += character;
    }
    return ConversationTitle.create(
      `${truncated.replace(/[,\s]+$/u, '')}${TRUNCATION_MARK}`,
    );
  }
}
