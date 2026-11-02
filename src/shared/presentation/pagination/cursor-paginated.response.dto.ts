import { ApiProperty } from '@nestjs/swagger';
import { CursorPaginatedResult } from 'shared/application/pagination/cursor-paginated-result';
import { CursorPaginationDto } from './cursor-pagination.dto';

export class CursorPaginatedResponseDto<T> {
  @ApiProperty({
    isArray: true,
    type: Object,
    description: 'Cursor-paginated data.',
  })
  data: T[];

  @ApiProperty({ type: CursorPaginationDto })
  pagination: CursorPaginationDto;

  static create<T>(
    result: CursorPaginatedResult<T>,
  ): CursorPaginatedResponseDto<T> {
    return {
      data: result.data,
      pagination: {
        type: 'cursor',
        pageSize: result.pagination.pageSize,
        nextCursor: result.pagination.nextCursor,
        hasNextPage: result.pagination.hasNextPage,
      },
    } as CursorPaginatedResponseDto<T>;
  }
}
