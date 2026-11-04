import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ConversationKind } from '../../../domain/enums/conversation-kind.enum';

interface ConversationCreateShape {
  kind: ConversationKind;
  recipientUserId?: string;
  memberUserIds?: string[];
  title?: string | null;
}

@ValidatorConstraint({ name: 'conversationCreateShape', async: false })
export class ConversationCreateShapeValidator implements ValidatorConstraintInterface {
  validate(_kind: unknown, args: ValidationArguments): boolean {
    const request = args.object as ConversationCreateShape;
    if (request.kind === ConversationKind.DIRECT) {
      return (
        Boolean(request.recipientUserId) &&
        request.memberUserIds === undefined &&
        (request.title === undefined || request.title === null)
      );
    }
    if (request.kind === ConversationKind.GROUP) {
      return request.recipientUserId === undefined;
    }
    return false;
  }

  defaultMessage(): string {
    return 'Conversation request fields do not match the requested kind';
  }
}
