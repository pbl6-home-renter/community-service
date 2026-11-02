import { DomainException } from './domain.exception';

export class CursorInvalidException extends DomainException {
  constructor() {
    super('The pagination cursor is invalid', 422, 'INVALID_CURSOR');
  }
}
