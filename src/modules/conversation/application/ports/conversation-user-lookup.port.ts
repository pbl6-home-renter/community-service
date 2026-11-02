import { Uuid } from 'shared/domain/value-objects/uuid.vo';

/** Looks up user identities owned by Identity Service. */
export interface ConversationUserLookup {
  findExistingUserIds(userIds: Uuid[]): Promise<Set<string>>;
}
