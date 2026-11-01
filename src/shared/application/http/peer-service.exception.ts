import { DomainException } from 'shared/domain/exceptions/domain.exception';
import { PeerService } from './peer-service.enum';

/** The peer could not answer: not configured, unreachable, timed out or 5xx. */
export class PeerServiceUnavailableException extends DomainException {
  constructor(
    readonly service: PeerService,
    reason: string,
  ) {
    super(`${service} unavailable: ${reason}`, 503, 'SERVICE_UNAVAILABLE');
  }
}

/** The peer answered with a 4xx; status and code are kept from its error envelope. */
export class PeerServiceRequestException extends DomainException {
  constructor(
    readonly service: PeerService,
    statusCode: number,
    code: string,
  ) {
    super(`${service} rejected the request`, statusCode, code);
  }
}
