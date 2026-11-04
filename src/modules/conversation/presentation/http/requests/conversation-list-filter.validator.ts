import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ConversationKind } from '../../../domain/enums/conversation-kind.enum';
import { ConversationListRequestDto } from './conversation-list.request.dto';

@ValidatorConstraint({ name: 'conversationListFilters', async: false })
export class ConversationListFilterValidator implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const request = args.object as ConversationListRequestDto;
    const hasContextLookup =
      request.contextType !== undefined || request.contextId !== undefined;

    if (
      (request.contextType === undefined) !==
      (request.contextId === undefined)
    ) {
      return false;
    }
    if (request.hasContext === false && hasContextLookup) {
      return false;
    }
    if (request.otherUserId !== undefined) {
      return (
        request.kind === ConversationKind.DIRECT &&
        request.q === undefined &&
        request.hasContext === undefined &&
        !hasContextLookup
      );
    }
    return true;
  }

  defaultMessage(): string {
    return 'Conversation list filters are not a valid combination';
  }
}
