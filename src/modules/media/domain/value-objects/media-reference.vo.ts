import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { isValidUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';

/** Stable media identity; download URLs are resolved only in HTTP responses. */
export class MediaReference {
  private constructor(readonly mediaId: Uuid) {}

  static create(mediaId: Uuid): MediaReference {
    if (!isValidUuid(mediaId)) {
      throw new ValidationException('mediaId must be a valid UUID');
    }
    return new MediaReference(mediaId);
  }
}
