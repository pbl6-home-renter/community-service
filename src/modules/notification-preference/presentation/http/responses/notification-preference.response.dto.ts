import { ApiProperty } from '@nestjs/swagger';
import { NotificationCategory } from '../../../domain/enums/notification-category.enum';

export class NotificationPreferenceResponseDto {
  @ApiProperty({ enum: NotificationCategory }) type: NotificationCategory;
  @ApiProperty() pushEnabled: boolean;
}

export class NotificationPreferenceUpdateResponseDto {
  @ApiProperty({ format: 'date-time' }) updatedAt: Date;
}
