import { ValidationException } from 'shared/domain/exceptions/validation.exception';

export class ConversationTitle {
  private constructor(readonly value: string) {}

  static create(value: string): ConversationTitle {
    const normalizedValue = value.trim();

    if (normalizedValue.length === 0 || normalizedValue.length > 255) {
      throw new ValidationException(
        'Conversation title must contain between 1 and 255 characters',
      );
    }

    return new ConversationTitle(normalizedValue);
  }
}
