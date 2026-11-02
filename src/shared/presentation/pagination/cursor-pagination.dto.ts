import { ApiProperty } from '@nestjs/swagger';
import { CursorPageInfo } from 'shared/application/pagination/cursor-page-info';

export class CursorPaginationDto implements CursorPageInfo {
  @ApiProperty({ enum: ['cursor'], example: 'cursor' })
  type = 'cursor' as const;

  @ApiProperty({ example: 30 })
  pageSize: number;

  @ApiProperty({ nullable: true, example: 'eyJ2ZXJzaW9uIjoxLC4uLn0' })
  nextCursor: string | null;

  @ApiProperty({ example: true })
  hasNextPage: boolean;
}
