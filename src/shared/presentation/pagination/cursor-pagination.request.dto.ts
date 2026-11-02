import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  CursorPageQuery,
  DEFAULT_CURSOR_PAGE_SIZE,
  MAX_CURSOR_PAGE_SIZE,
} from 'shared/application/pagination/cursor-page-query';

export class CursorPaginationRequestDto implements CursorPageQuery {
  @ApiPropertyOptional({
    description: 'Opaque cursor returned by the previous page.',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Number of records to return.',
    default: DEFAULT_CURSOR_PAGE_SIZE,
    minimum: 1,
    maximum: MAX_CURSOR_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_CURSOR_PAGE_SIZE)
  pageSize: number = DEFAULT_CURSOR_PAGE_SIZE;
}
