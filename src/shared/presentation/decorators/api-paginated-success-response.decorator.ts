import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { OffsetPaginationDto } from '../pagination/offset-pagination.dto';

export interface ApiPaginatedSuccessResponseOptions<
  TModel extends Type<unknown>,
> {
  status?: number;
  code: string;
  dataDto: TModel;
  extraModels?: Type<unknown>[];
  description?: string;
}

export const ApiPaginatedSuccessResponse = <TModel extends Type<unknown>>(
  options: ApiPaginatedSuccessResponseOptions<TModel>,
) => {
  const status = options.status ?? 200;

  return applyDecorators(
    ApiExtraModels(
      options.dataDto,
      ...(options.extraModels ?? []),
      OffsetPaginationDto,
    ),
    ApiResponse({
      status,
      description: options.description,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['statusCode', 'code', 'data', 'pagination'],
        properties: {
          statusCode: { type: 'integer', enum: [status] },
          code: { type: 'string', enum: [options.code] },
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(options.dataDto) },
          },
          pagination: { $ref: getSchemaPath(OffsetPaginationDto) },
        },
      },
    }),
  );
};
