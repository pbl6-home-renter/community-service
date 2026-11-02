import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from 'shared/infrastructure/database/abstract.typeorm-entity';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { PushPlatform } from '../../domain/enums/push-platform.enum';

@Entity('push_devices')
@Index('UQ_push_devices_token', ['token'], { unique: true })
@Index('IDX_push_devices_user_active', ['userId', 'revokedAt'])
export class PushDeviceTypeormEntity extends AbstractEntity {
  @Column({ type: 'uuid' }) userId: Uuid;
  @Column({ type: 'varchar', length: 512 }) token: string;
  @Column({ type: 'varchar', length: 20 }) platform: PushPlatform;
  @Column({ type: 'timestamptz' }) lastSeenAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) revokedAt: Date | null;
}
