import {
  ArgumentMetadata,
  HttpException,
  HttpStatus,
  Injectable,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';

function validationException(code: string): HttpException {
  return new HttpException(
    { statusCode: HttpStatus.UNPROCESSABLE_ENTITY, code },
    HttpStatus.UNPROCESSABLE_ENTITY,
  );
}

function flattenErrors(errors: ValidationError[]): ValidationError[] {
  return errors.flatMap((error) => [
    error,
    ...flattenErrors(error.children ?? []),
  ]);
}

@Injectable()
export class AppValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: false,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      exceptionFactory: (errors: ValidationError[]) => {
        const flattened = flattenErrors(errors);
        const propertyError = flattened.find(
          (error) =>
            error.constraints && !('whitelistValidation' in error.constraints),
        );

        if (propertyError) {
          const constraints = propertyError.constraints!;
          const key =
            [
              'isRequired',
              'isDefined',
              'isString',
              'isNotEmpty',
              'isObject',
            ].find((name) => name in constraints) ??
            Object.keys(constraints)[0];
          const message = constraints[key];
          const code =
            message && /^[A-Z][A-Z0-9_]*$/.test(message)
              ? message
              : 'VALIDATION_FAILED';
          return validationException(code);
        }

        return validationException(
          flattened.some(
            (error) => error.constraints?.whitelistValidation !== undefined,
          )
            ? 'UNEXPECTED_FIELD'
            : 'VALIDATION_FAILED',
        );
      },
    });
  }

  override async transform(value: unknown, metadata: ArgumentMetadata) {
    if (
      metadata.type === 'body' &&
      metadata.data === undefined &&
      (value === null || typeof value !== 'object' || Array.isArray(value))
    ) {
      throw new HttpException(
        { statusCode: HttpStatus.BAD_REQUEST, code: 'INVALID_REQUEST_BODY' },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await super.transform(value, metadata);
    } catch (error) {
      const dto = metadata.metatype as
        | (NonNullable<ArgumentMetadata['metatype']> & {
            readonly unexpectedFieldCode?: string;
          })
        | undefined;
      if (
        error instanceof HttpException &&
        error.getStatus() === HttpStatus.UNPROCESSABLE_ENTITY &&
        dto?.unexpectedFieldCode
      ) {
        const payload = error.getResponse() as { code?: string };
        if (payload.code === 'UNEXPECTED_FIELD') {
          throw validationException(dto.unexpectedFieldCode);
        }
      }
      throw error;
    }
  }
}
