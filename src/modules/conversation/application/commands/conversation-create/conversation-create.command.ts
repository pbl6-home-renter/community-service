import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationKind } from '../../../domain/enums/conversation-kind.enum';
import { ConversationTitle } from '../../../domain/value-objects/conversation-title.vo';

export class ConversationCreateCommand implements ICommand {
  constructor(
    readonly kind: ConversationKind,
    readonly callerUserId: Uuid,
    readonly recipientUserId: Uuid | null,
    readonly memberUserIds: Uuid[],
    readonly title: ConversationTitle | null,
  ) {}
}
