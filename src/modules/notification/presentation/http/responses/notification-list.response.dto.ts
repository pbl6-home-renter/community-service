import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { NotificationEntity } from '../../../domain/entities/notification.entity';
import { NotificationType } from '../../../domain/enums/notification-type.enum';

export class NotificationListResponseDto {
  @ApiProperty({ format: 'uuid' }) id: Uuid;
  @ApiProperty({ format: 'uuid' }) recipientUserId: Uuid;
  @ApiProperty() sourceService: string;
  @ApiProperty({ format: 'uuid' }) eventId: Uuid;
  @ApiProperty({ enum: NotificationType }) type: NotificationType;
  @ApiProperty() title: string;
  @ApiProperty() body: string;
  @ApiProperty({ nullable: true }) deepLink: string | null;
  @ApiProperty({ type: Object, nullable: true }) data: Record<
    string,
    unknown
  > | null;
  @ApiProperty({ format: 'date-time' }) createdAt: Date;
  @ApiProperty({ format: 'date-time', nullable: true }) readAt: Date | null;
  static fromDomain(entity: NotificationEntity): NotificationListResponseDto {
    return Object.assign(new NotificationListResponseDto(), {
      id: entity.id,
      recipientUserId: entity.recipientUserId,
      sourceService: entity.sourceService,
      eventId: entity.eventId,
      type: entity.type,
      title: entity.title,
      body: entity.body,
      deepLink: entity.deepLink,
      data: entity.data,
      createdAt: entity.createdAt,
      readAt: entity.readAt,
    });
  }
}
