import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class SampleNotFoundException extends DomainException {
  constructor(id: string) {
    super(`Sample with ID "${id}" was not found`, 404, 'NOT_FOUND');
  }
}
