import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class InvalidRetryPolicyException extends DomainException {
  constructor(reason: string) {
    super(
      `Invalid retry policy: ${reason}`,
      422,
      'INVALID_RETRY_POLICY_EXPCEPTION',
    );
  }
}
