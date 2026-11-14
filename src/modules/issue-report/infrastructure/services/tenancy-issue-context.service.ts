import { Inject, Injectable } from '@nestjs/common';
import { INTERNAL_HTTP_DI_TOKEN } from 'shared/application/di-tokens';
import { PeerServiceRequestException } from 'shared/application/http/peer-service.exception';
import { PeerService } from 'shared/application/http/peer-service.enum';
import { IInternalHttpClient } from 'shared/application/ports/internal-http-client.port';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import {
  IssueContext,
  IssueContextPort,
} from '../../application/ports/issue-context.port';

@Injectable()
export class TenancyIssueContextService implements IssueContextPort {
  constructor(
    @Inject(INTERNAL_HTTP_DI_TOKEN.CLIENT)
    private readonly client: IInternalHttpClient,
  ) {}

  byRoom(roomId: Uuid): Promise<IssueContext | null> {
    return this.find(`/internal/issue-context/rooms/${roomId}`);
  }

  byContract(contractId: Uuid): Promise<IssueContext | null> {
    return this.find(`/internal/issue-context/contracts/${contractId}`);
  }

  visibleContracts(userId: Uuid, role: UserRole): Promise<Uuid[]> {
    return this.client.get(
      PeerService.TENANCY,
      `/internal/issue-context/users/${userId}/contracts`,
      { query: { role } },
    );
  }

  private async find(path: string): Promise<IssueContext | null> {
    try {
      return await this.client.get<IssueContext>(PeerService.TENANCY, path);
    } catch (error) {
      if (
        error instanceof PeerServiceRequestException &&
        error.statusCode === 404
      )
        return null;
      throw error;
    }
  }
}
