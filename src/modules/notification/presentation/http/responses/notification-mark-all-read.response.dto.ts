import { ApiProperty } from '@nestjs/swagger';

export class NotificationMarkAllReadResponseDto {
  @ApiProperty({ minimum: 0 }) markedCount: number;
}
