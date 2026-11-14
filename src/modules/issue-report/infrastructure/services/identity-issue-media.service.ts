import { Inject, Injectable } from '@nestjs/common';
import { INTERNAL_HTTP_DI_TOKEN } from 'shared/application/di-tokens';
import { PeerService } from 'shared/application/http/peer-service.enum';
import { IInternalHttpClient } from 'shared/application/ports/internal-http-client.port';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IssueMediaPort } from '../../application/ports/issue-media.port';

interface MediaItem {
  id: Uuid;
  ownerType: string;
  ownerId: Uuid;
  purpose: string;
  status: string;
}

@Injectable()
export class IdentityIssueMediaService implements IssueMediaPort {
  constructor(
    @Inject(INTERNAL_HTTP_DI_TOKEN.CLIENT)
    private readonly client: IInternalHttpClient,
  ) {}

  async completedPhotoIds(issueId: Uuid): Promise<Uuid[]> {
    const items = await this.client.get<MediaItem[]>(
      PeerService.IDENTITY,
      `/internal/media/owner/issue_report/${issueId}`,
    );
    return items
      .filter(
        (item) =>
          item.ownerType === 'issue_report' &&
          item.ownerId === issueId &&
          item.purpose === 'issue_photo' &&
          item.status === 'uploaded',
      )
      .map((item) => item.id);
  }
}
