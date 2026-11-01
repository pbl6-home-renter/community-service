import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { SortOrder } from 'shared/domain/value-objects/sort-order.vo';

export class OffsetPaginationQueryRequestDto<
  TFilter = Record<string, unknown>,
> implements OffsetPageQuery<TFilter> {
  @ApiPropertyOptional({
    description: 'Số nguyên dương, bắt đầu từ 1',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageNo: number = 1;

  @ApiPropertyOptional({
    description: 'Số nguyên dương, tối đa 100',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @ApiPropertyOptional({
    description:
      'Một field từ whitelist của endpoint; ví dụ: createdAt. Client chỉ gửi một sort, không chứa dấu phẩy.',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString({ message: 'sort must be a single string' })
  @Matches(/^[^,]+$/, {
    message: 'sort cannot contain commas and must be a single field',
  })
  sort?: string;

  @ApiPropertyOptional({
    description:
      'Thứ tự sắp xếp: asc hoặc desc. Bỏ trống thì dùng thứ tự mặc định của endpoint.',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'], {
    message: 'order must be either asc or desc',
  })
  order?: SortOrder;

  @ApiPropertyOptional({
    description:
      'Object có field được endpoint cho phép, serialized theo OpenAPI deepObject (ví dụ: filter[status]=available)',
    type: Object,
  })
  @IsOptional()
  @IsObject({ message: 'filter must be an object' })
  filter?: TFilter;
}
