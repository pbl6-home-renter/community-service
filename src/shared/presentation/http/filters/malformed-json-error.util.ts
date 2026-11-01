import { HttpException, HttpStatus } from '@nestjs/common';

export function isMalformedJsonError(exception: unknown): boolean {
  if (exception instanceof HttpException) {
    const response = exception.getResponse();
    if (
      typeof response === 'object' &&
      response !== null &&
      'code' in response &&
      typeof response.code === 'string' &&
      response.code
    ) {
      return false;
    }
  }

  const error =
    exception instanceof HttpException &&
    exception.getStatus() === HttpStatus.BAD_REQUEST
      ? (exception.cause ?? exception)
      : exception;

  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const status =
    'status' in error
      ? error.status
      : 'statusCode' in error
        ? error.statusCode
        : undefined;

  return (
    status === HttpStatus.BAD_REQUEST &&
    (('type' in error && error.type === 'entity.parse.failed') ||
      error instanceof SyntaxError)
  );
}
