import { SetMetadata } from '@nestjs/common';
import { AuthMetadataKeys } from './auth-metadata.keys';

/**
 * Service-to-service endpoint: authenticated by `X-Service-Token` instead of
 * a user access token. Mount these controllers under `internal/`, which is
 * outside the `api/v1` prefix and never routed by the API Gateway.
 */
export const InternalOnly = () =>
  SetMetadata(AuthMetadataKeys.INTERNAL_ONLY, true);
