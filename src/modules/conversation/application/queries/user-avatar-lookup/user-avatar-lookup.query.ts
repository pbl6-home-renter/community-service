import { Uuid } from 'shared/domain/value-objects/uuid.vo';

/** Avatar URL by lower-cased user id, for display only (best effort). */
export class UserAvatarLookupQuery {
  constructor(readonly userIds: readonly (Uuid | null)[]) {}
}
