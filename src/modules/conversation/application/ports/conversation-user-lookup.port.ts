import { Uuid } from 'shared/domain/value-objects/uuid.vo';

/** Looks up user identities owned by Identity Service. */
export interface ConversationUserLookup {
  findDisplayNames(userIds: Uuid[]): Promise<Map<string, string>>;
}
