import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from 'shared/infrastructure/database/abstract.typeorm-entity';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { NotificationCategory } from '../../domain/enums/notification-category.enum';

@Entity('notification_preferences')
@Index('UQ_notification_preferences_user_category', ['userId', 'category'], {
  unique: true,
})
export class NotificationPreferenceTypeormEntity extends AbstractEntity {
  @Column({ type: 'uuid' }) userId: Uuid;
  @Column({ type: 'varchar', length: 20 }) category: NotificationCategory;
  @Column({ type: 'boolean', default: true }) pushEnabled: boolean;
}
