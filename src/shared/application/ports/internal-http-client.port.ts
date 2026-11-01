import { PeerService } from '../http/peer-service.enum';

export interface InternalHttpGetOptions {
  query?: Record<string, string | number | boolean | undefined>;
  /**
   * Forward the caller's access token instead of sending `X-Service-Token`.
   * Use it when the call is made on behalf of a user.
   */
  bearerToken?: string;
}

/**
 * Synchronous reads from another service. Writes go through events, never this client.
 *
 * Resolves with the peer's `data` (envelope unwrapped). Rejects with
 * `PeerServiceUnavailableException` or `PeerServiceRequestException`; there is no retry,
 * so the caller decides between a fallback (display data) and failing closed (decisions).
 */
export interface IInternalHttpClient {
  get<T>(
    service: PeerService,
    path: string,
    options?: InternalHttpGetOptions,
  ): Promise<T>;
}
