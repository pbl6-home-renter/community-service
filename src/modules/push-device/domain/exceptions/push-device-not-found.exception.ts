import { DomainException } from 'shared/domain/exceptions/domain.exception';
export class PushDeviceNotFoundException extends DomainException {
  constructor() {
    super('Push device not found', 404, 'NOT_FOUND');
  }
}
