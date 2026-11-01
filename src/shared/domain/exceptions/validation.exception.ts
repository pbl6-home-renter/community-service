import { DomainException } from './domain.exception';

export class ValidationException extends DomainException {
  constructor(message = 'Validation failed') {
    super(message, 422, 'VALIDATION_FAILED');
  }
}
