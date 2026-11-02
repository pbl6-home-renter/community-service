import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ConversationListRequestDto } from './conversation-list.request.dto';

@ValidatorConstraint({ name: 'conversationListContextPair', async: false })
export class ConversationListContextValidator implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const request = args.object as ConversationListRequestDto;
    return (
      (request.contextType === undefined) === (request.contextId === undefined)
    );
  }

  defaultMessage(): string {
    return 'contextType and contextId must be provided together';
  }
}
