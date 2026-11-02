import { Inject, Injectable } from '@nestjs/common';
import { INTERNAL_HTTP_DI_TOKEN } from 'shared/application/di-tokens';
import { PeerService } from 'shared/application/http/peer-service.enum';
import { PeerServiceUnavailableException } from 'shared/application/http/peer-service.exception';
import { IInternalHttpClient } from 'shared/application/ports/internal-http-client.port';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MessageContentInvalidException } from '../../domain/exceptions/message-content-invalid.exception';
import { MessageMediaValidatorPort } from '../../application/ports/message-media-validator.port';

interface MediaChatAttachmentValidationResult {
  valid: boolean;
}

@Injectable()
export class IdentityMessageMediaValidatorService implements MessageMediaValidatorPort {
  constructor(
    @Inject(INTERNAL_HTTP_DI_TOKEN.CLIENT)
    private readonly internalHttpClient: IInternalHttpClient,
  ) {}

  async assertAttachable(mediaId: Uuid, conversationId: Uuid): Promise<void> {
    let result: MediaChatAttachmentValidationResult;
    try {
      result =
        await this.internalHttpClient.get<MediaChatAttachmentValidationResult>(
          PeerService.IDENTITY,
          '/internal/media/chat-attachment',
          { query: { mediaId, conversationId } },
        );
    } catch {
      throw new PeerServiceUnavailableException(
        PeerService.IDENTITY,
        'Chat media validation failed',
      );
    }

    if (!result.valid) throw new MessageContentInvalidException();
  }
}
