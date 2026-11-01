import { ApiProperty } from '@nestjs/swagger';
import { OffsetPaginationDto } from './offset-pagination.dto';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';

export class PaginatedResponseDto<T> {
  @ApiProperty({
    isArray: true,
    type: Object,
    description: 'Dữ liệu được phân trang',
  })
  data: T[];

  @ApiProperty({
    type: OffsetPaginationDto,
    description: 'Thông tin phân trang',
  })
  pagination: OffsetPaginationDto;

  static create<T>(result: PaginatedResult<T>): PaginatedResponseDto<T> {
    return {
      data: result.data,
      pagination: {
        type: 'offset',
        pageNo: result.pagination.pageNo,
        pageSize: result.pagination.pageSize,
        totalItems: result.pagination.totalItems,
        totalPages: result.pagination.totalPages,
        hasNextPage: result.pagination.hasNextPage,
        hasPreviousPage: result.pagination.hasPreviousPage,
      },
    } as PaginatedResponseDto<T>;
  }
}
