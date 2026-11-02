import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationTitle } from '../../../domain/value-objects/conversation-title.vo';

export class ConversationMetadataUpdateCommand {
  constructor(
    readonly conversationId: Uuid,
    readonly actorUserId: Uuid,
    readonly title: ConversationTitle | null | undefined,
    readonly avatarMediaId: Uuid | null | undefined,
  ) {}
}
