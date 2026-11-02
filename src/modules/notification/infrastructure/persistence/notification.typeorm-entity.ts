import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from 'shared/infrastructure/database/abstract.typeorm-entity';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { NotificationType } from '../../domain/enums/notification-type.enum';

@Entity('notifications')
@Index(
  'UQ_notifications_event_recipient',
  ['sourceService', 'eventId', 'recipientUserId'],
  { unique: true },
)
@Index('IDX_notifications_recipient_created', [
  'recipientUserId',
  'createdAt',
  'id',
])
export class NotificationTypeormEntity extends AbstractEntity {
  @Column({ type: 'uuid' }) recipientUserId: Uuid;
  @Column({ type: 'varchar', length: 100 }) sourceService: string;
  @Column({ type: 'uuid' }) eventId: Uuid;
  @Column({ type: 'varchar', length: 20 }) type: NotificationType;
  @Column({ type: 'varchar', length: 255 }) title: string;
  @Column({ type: 'varchar', length: 2000 }) body: string;
  @Column({ type: 'varchar', length: 2048, nullable: true }) deepLink:
    string | null;
  @Column({ type: 'jsonb', nullable: true }) data: Record<
    string,
    unknown
  > | null;
  @Column({ type: 'timestamptz', nullable: true }) readAt: Date | null;
}
