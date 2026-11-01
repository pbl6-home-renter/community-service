import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

export interface ApiSuccessResponseOptions<TModel extends Type<unknown>> {
  status?: number;
  code: string;
  dataDto?: TModel;
  description?: string;
}

export const ApiSuccessResponse = <TModel extends Type<unknown>>(
  options: ApiSuccessResponseOptions<TModel>,
) => {
  const status = options.status ?? 200;
  const decorators: Array<
    ClassDecorator | MethodDecorator | PropertyDecorator
  > = [];

  if (status === 204) {
    return applyDecorators(
      ApiResponse({ status, description: options.description }),
    );
  }

  if (options.dataDto) {
    decorators.push(ApiExtraModels(options.dataDto));
  }

  return applyDecorators(
    ...decorators,
    ApiResponse({
      status,
      description: options.description,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['statusCode', 'code', 'data'],
        properties: {
          statusCode: { type: 'integer', enum: [status] },
          code: { type: 'string', enum: [options.code] },
          data: options.dataDto
            ? { $ref: getSchemaPath(options.dataDto) }
            : { type: 'object', nullable: true, enum: [null] },
        },
      },
    }),
  );
};
