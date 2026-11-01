import { ApiProperty } from '@nestjs/swagger';
import { OffsetPageInfo } from 'shared/application/pagination/offset-page-info';

export class OffsetPaginationDto implements OffsetPageInfo {
  @ApiProperty({
    example: 'offset',
    description: 'Discriminator phân loại kiểu phân trang',
    enum: ['offset'],
  })
  type = 'offset' as const;

  @ApiProperty({
    example: 1,
    description: 'Số thứ tự trang hiện tại',
  })
  pageNo: number;

  @ApiProperty({
    example: 20,
    description: 'Số lượng bản ghi trên một trang',
  })
  pageSize: number;

  @ApiProperty({
    example: 2,
    description: 'Tổng số lượng bản ghi',
  })
  totalItems: number;

  @ApiProperty({
    example: 1,
    description: 'Tổng số trang',
  })
  totalPages: number;

  @ApiProperty({
    example: false,
    description: 'Có trang kế tiếp hay không',
  })
  hasNextPage: boolean;

  @ApiProperty({
    example: false,
    description: 'Có trang trước đó hay không',
  })
  hasPreviousPage: boolean;
}
