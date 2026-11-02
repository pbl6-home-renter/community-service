import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { NotificationCategory } from '../../../domain/enums/notification-category.enum';

export class NotificationPreferenceItemRequestDto {
  @ApiProperty({ enum: NotificationCategory })
  @IsEnum(NotificationCategory)
  type: NotificationCategory;

  @ApiProperty()
  @IsBoolean()
  pushEnabled: boolean;
}

export class NotificationPreferenceUpdateRequestDto {
  @ApiProperty({ type: [NotificationPreferenceItemRequestDto] })
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => NotificationPreferenceItemRequestDto)
  preferences: NotificationPreferenceItemRequestDto[];
}
