import { Inject, Injectable } from '@nestjs/common';
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
}

@Injectable()
export class IdentityConversationUserLookupService implements ConversationUserLookup {
  constructor(
    @Inject(INTERNAL_HTTP_DI_TOKEN.CLIENT)
    private readonly internalHttpClient: IInternalHttpClient,
  ) {}

  async findDisplayNames(userIds: Uuid[]): Promise<Map<string, string>> {
    const displayNames = new Map<string, string>();
    for (
      let index = 0;
      index < userIds.length;
      index += IDENTITY_USER_LOOKUP_BATCH_SIZE
    ) {
      const batch = userIds.slice(
        index,
        index + IDENTITY_USER_LOOKUP_BATCH_SIZE,
      );
      const users = await this.internalHttpClient.get<IdentityUserSummary[]>(
        PeerService.IDENTITY,
        IDENTITY_ROUTES.USERS,
        { query: { ids: batch.join(',') } },
      );
      for (const user of users) {
        if (!user.isDeleted) {
          displayNames.set(user.id.toLowerCase(), user.name);
        }
      }
    }
    return displayNames;
  }
}
