import { Inject, Injectable } from '@nestjs/common';
import { INTERNAL_HTTP_DI_TOKEN } from 'shared/application/di-tokens';
import { PeerService } from 'shared/application/http/peer-service.enum';
import { PeerServiceUnavailableException } from 'shared/application/http/peer-service.exception';
import { IInternalHttpClient } from 'shared/application/ports/internal-http-client.port';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationAvatarInvalidException } from '../../domain/exceptions/conversation-avatar-invalid.exception';
import { ConversationAvatarValidatorPort } from '../../application/ports/conversation-avatar-validator.port';

interface MediaConversationAvatarValidationResult {
  valid: boolean;
}

@Injectable()
export class IdentityConversationAvatarValidatorService implements ConversationAvatarValidatorPort {
  constructor(
    @Inject(INTERNAL_HTTP_DI_TOKEN.CLIENT)
    private readonly internalHttpClient: IInternalHttpClient,
  ) {}

  async assertAttachable(mediaId: Uuid, conversationId: Uuid): Promise<void> {
    let result: MediaConversationAvatarValidationResult;
    try {
      result =
        await this.internalHttpClient.get<MediaConversationAvatarValidationResult>(
          PeerService.IDENTITY,
          '/internal/media/conversation-avatar',
          { query: { mediaId, conversationId } },
        );
    } catch {
      throw new PeerServiceUnavailableException(
        PeerService.IDENTITY,
        'Conversation avatar validation failed',
      );
    }

    if (!result.valid) throw new ConversationAvatarInvalidException();
  }
}
