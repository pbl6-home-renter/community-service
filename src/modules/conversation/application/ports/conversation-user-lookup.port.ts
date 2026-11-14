import { Uuid } from 'shared/domain/value-objects/uuid.vo';

/** Looks up user identities owned by Identity Service. */
export interface ConversationUserLookup {
  findDisplayNames(userIds: Uuid[]): Promise<Map<string, string>>;
  /**
   * Avatar URL by lower-cased user id. Best effort: users without an avatar are
   * left out and an unavailable Identity Service yields an empty map.
   */
  findAvatarUrls(userIds: readonly Uuid[]): Promise<Map<string, string>>;
}
