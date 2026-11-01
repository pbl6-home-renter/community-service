import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_CODE_METADATA_KEY } from '../../decorators/response-code.decorator';

export interface SuccessResponse<T> {
  statusCode: number;
  code: string;
  data: T;
  pagination?: unknown;
}

@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<
  T,
  SuccessResponse<T> | T
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponse<T> | T> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        const statusCode = response?.statusCode ?? HttpStatus.OK;

        if (statusCode === HttpStatus.NO_CONTENT) {
          return data;
        }

        if (response?.headersSent) {
          return data;
        }

        if (data instanceof StreamableFile) {
          return data;
        }

        const customCode = this.reflector.getAllAndOverride<string>(
          RESPONSE_CODE_METADATA_KEY,
          [context.getHandler(), context.getClass()],
        );

        if (
          data !== null &&
          typeof data === 'object' &&
          'statusCode' in data &&
          'code' in data &&
          'data' in data
        ) {
          return data;
        }

        let code = customCode;
        if (!code) {
          if (
            data !== null &&
            typeof data === 'object' &&
            'code' in data &&
            typeof data.code === 'string'
          ) {
            code = data.code;
          } else if (statusCode === HttpStatus.CREATED) {
            code = 'CREATED';
          } else {
            code = 'SUCCESS';
          }
        }

        if (
          data !== null &&
          typeof data === 'object' &&
          'pagination' in data &&
          ('data' in data || 'items' in data)
        ) {
          return {
            statusCode,
            code,
            data: data.data ?? data.items,
            pagination: data.pagination,
          };
        }

        return {
          statusCode,
          code,
          data: data ?? null,
        };
      }),
    );
  }
}
