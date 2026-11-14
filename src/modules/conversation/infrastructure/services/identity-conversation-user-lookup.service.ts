import { Inject, Injectable, Logger } from '@nestjs/common';
import { INTERNAL_HTTP_DI_TOKEN } from 'shared/application/di-tokens';
import { PeerService } from 'shared/application/http/peer-service.enum';
import { IInternalHttpClient } from 'shared/application/ports/internal-http-client.port';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationUserLookup } from '../../application/ports/conversation-user-lookup.port';
import {
  IDENTITY_ROUTES,
  IDENTITY_USER_LOOKUP_BATCH_SIZE,
} from '../constants/identity-routes.constant';

interface IdentityUserSummary {
  id: Uuid;
  name: string;
  isDeleted: boolean;
  avatarUrl?: string | null;
}

@Injectable()
export class IdentityConversationUserLookupService implements ConversationUserLookup {
  private readonly logger = new Logger(
    IdentityConversationUserLookupService.name,
  );

  constructor(
    @Inject(INTERNAL_HTTP_DI_TOKEN.CLIENT)
    private readonly internalHttpClient: IInternalHttpClient,
  ) {}

  async findDisplayNames(userIds: Uuid[]): Promise<Map<string, string>> {
    const displayNames = new Map<string, string>();
    for (const user of await this.lookup(userIds)) {
      if (!user.isDeleted) {
        displayNames.set(user.id.toLowerCase(), user.name);
      }
    }
    return displayNames;
  }

  async findAvatarUrls(userIds: readonly Uuid[]): Promise<Map<string, string>> {
    const avatarUrls = new Map<string, string>();
    const uniqueIds = [...new Set(userIds.map((id) => id.toLowerCase()))];
    if (uniqueIds.length === 0) return avatarUrls;
    try {
      for (const user of await this.lookup(uniqueIds as Uuid[])) {
        if (!user.isDeleted && user.avatarUrl) {
          avatarUrls.set(user.id.toLowerCase(), user.avatarUrl);
        }
      }
    } catch (error) {
      // Avatars are decoration: chat must keep working without Identity.
      this.logger.warn(
        `Avatar lookup failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return avatarUrls;
  }

  private async lookup(
    userIds: readonly Uuid[],
  ): Promise<IdentityUserSummary[]> {
    const users: IdentityUserSummary[] = [];
    for (
      let index = 0;
      index < userIds.length;
      index += IDENTITY_USER_LOOKUP_BATCH_SIZE
    ) {
      const batch = userIds.slice(
        index,
        index + IDENTITY_USER_LOOKUP_BATCH_SIZE,
      );
      users.push(
        ...(await this.internalHttpClient.get<IdentityUserSummary[]>(
          PeerService.IDENTITY,
          IDENTITY_ROUTES.USERS,
          { query: { ids: batch.join(',') } },
        )),
      );
    }
    return users;
  }
}
