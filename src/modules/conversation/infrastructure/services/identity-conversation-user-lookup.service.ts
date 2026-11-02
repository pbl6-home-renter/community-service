import { Inject, Injectable } from '@nestjs/common';
import { INTERNAL_HTTP_DI_TOKEN } from 'shared/application/di-tokens';
import { PeerService } from 'shared/application/http/peer-service.enum';
import { IInternalHttpClient } from 'shared/application/ports/internal-http-client.port';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationUserLookup } from '../../application/ports/conversation-user-lookup.port';
import { IDENTITY_ROUTES } from '../constants/identity-routes.constant';

interface IdentityUserSummary {
  id: Uuid;
  isDeleted: boolean;
}

@Injectable()
export class IdentityConversationUserLookupService implements ConversationUserLookup {
  constructor(
    @Inject(INTERNAL_HTTP_DI_TOKEN.CLIENT)
    private readonly internalHttpClient: IInternalHttpClient,
  ) {}

  async findExistingUserIds(userIds: Uuid[]): Promise<Set<string>> {
    if (userIds.length === 0) return new Set();

    const users = await this.internalHttpClient.get<IdentityUserSummary[]>(
      PeerService.IDENTITY,
      IDENTITY_ROUTES.USERS,
      { query: { ids: userIds.join(',') } },
    );

    return new Set(
      users
        .filter((user) => !user.isDeleted)
        .map((user) => user.id.toLowerCase()),
    );
  }
}
