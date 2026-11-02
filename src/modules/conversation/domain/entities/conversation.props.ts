import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationContextType } from '../enums/conversation-context-type.enum';
import { ConversationKind } from '../enums/conversation-kind.enum';
import { ConversationTitle } from '../value-objects/conversation-title.vo';

export interface ConversationProps {
  id?: Uuid;
  kind: ConversationKind;
  contextType?: ConversationContextType | null;
  contextId?: Uuid | null;
  directPairKey?: string | null;
  title?: ConversationTitle | null;
  avatarMediaId?: Uuid | null;
  createdByUserId?: Uuid | null;
  createdAt?: Date;
  updatedAt?: Date;
  isDeleted?: boolean;
}
