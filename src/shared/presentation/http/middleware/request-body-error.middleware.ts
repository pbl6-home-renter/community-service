import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

export function requestBodyErrorMiddleware(
  error: unknown,
  _request: Request,
  _response: Response,
  next: NextFunction,
): void {
  if (
    error instanceof SyntaxError &&
    'status' in error &&
    error.status === 400
  ) {
    next(new BadRequestException(undefined, { cause: error }));
    return;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    error.status === 413 &&
    'type' in error &&
    error.type === 'entity.too.large'
  ) {
    next(new PayloadTooLargeException());
    return;
  }
  next(error);
}
