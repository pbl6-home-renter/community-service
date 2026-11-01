import type { IncomingMessage, ServerResponse } from 'node:http';

export function createRequestBodyVerifier(
  emptyBodyRequests: WeakSet<IncomingMessage>,
) {
  return function verifyRequestBody(
    request: IncomingMessage,
    _response: ServerResponse,
    body: Buffer,
  ): void {
    if (body.length === 0) {
      emptyBodyRequests.add(request);
    }
  };
}
