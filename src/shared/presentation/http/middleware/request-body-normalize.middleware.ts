import type { IncomingMessage } from 'node:http';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

export function createRequestBodyNormalizeMiddleware(
  emptyBodyRequests: WeakSet<IncomingMessage>,
): RequestHandler {
  return function requestBodyNormalizeMiddleware(
    request: Request,
    _response: Response,
    next: NextFunction,
  ): void {
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentLength = request.headers['content-length'];
      const transferEncoding = request.headers['transfer-encoding'];
      if (
        emptyBodyRequests.has(request) ||
        contentLength === '0' ||
        (!contentLength &&
          !transferEncoding &&
          (request.body === undefined ||
            Object.keys(request.body ?? {}).length === 0))
      ) {
        request.body = undefined;
      }
    }
    next();
  };
}
