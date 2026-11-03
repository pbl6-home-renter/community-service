import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from 'shared/infrastructure/database/abstract.typeorm-entity';
import { EmailDeliveryStatus } from '../../domain/enums/email-delivery-status.enum';

@Entity('email_deliveries')
@Index('IDX_email_deliveries_created_at', ['createdAt'])
export class EmailDeliveryTypeormEntity extends AbstractEntity {
  @Column({ type: 'varchar', length: 320 })
  recipientEmail: string;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'varchar', length: 20 })
  status: EmailDeliveryStatus;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt: Date | null;
}
