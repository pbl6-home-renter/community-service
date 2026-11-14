import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { CONVERSATION_DI_TOKEN } from '../../../conversation.di-token';
import { ConversationUserLookup } from '../../ports/conversation-user-lookup.port';
import { UserAvatarLookupQuery } from './user-avatar-lookup.query';

/** Lower-cased user id → avatar URL. */
export type UserAvatarUrls = ReadonlyMap<string, string>;

@QueryHandler(UserAvatarLookupQuery)
export class UserAvatarLookupQueryHandler implements IQueryHandler<
  UserAvatarLookupQuery,
  UserAvatarUrls
> {
  constructor(
    @Inject(CONVERSATION_DI_TOKEN.USER_LOOKUP)
    private readonly users: ConversationUserLookup,
  ) {}

  execute({ userIds }: UserAvatarLookupQuery): Promise<UserAvatarUrls> {
    return this.users.findAvatarUrls(
      userIds.filter((id): id is Uuid => id !== null),
    );
  }
}

export const avatarUrlOf = (
  avatars: UserAvatarUrls | undefined,
  userId: Uuid | null,
): string | null =>
  userId ? (avatars?.get(userId.toLowerCase()) ?? null) : null;
