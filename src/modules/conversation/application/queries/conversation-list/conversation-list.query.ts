import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationContextType } from '../../../domain/enums/conversation-context-type.enum';
import { ConversationKind } from '../../../domain/enums/conversation-kind.enum';

export class ConversationListQuery {
  constructor(
    readonly userId: Uuid,
    readonly pageNo: number,
    readonly pageSize: number,
    readonly contextType: ConversationContextType | null,
    readonly contextId: Uuid | null,
    readonly kind: ConversationKind | null,
    readonly hasContext: boolean | null,
    readonly searchKeyword: string | null,
    readonly otherUserId: Uuid | null,
  ) {}
}
