import { ApiHideProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, ValidateNested } from 'class-validator';
import { CursorPaginationRequestDto } from 'shared/presentation/pagination/cursor-pagination.request.dto';

class NotificationFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  unreadOnly?: boolean;
}

export class NotificationListRequestDto extends CursorPaginationRequestDto {
  @ApiPropertyOptional({ type: NotificationFilterDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationFilterDto)
  filter?: NotificationFilterDto;

  // Express's simple query parser keeps deepObject keys in bracket notation.
  @ApiHideProperty()
  @IsOptional()
  @IsIn(['true', 'false'])
  ['filter[unreadOnly]']?: string;
}
