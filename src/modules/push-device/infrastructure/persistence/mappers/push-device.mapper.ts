import { PushDeviceEntity } from '../../../domain/entities/push-device.entity';
import { PushDeviceTypeormEntity } from '../push-device.typeorm-entity';

export class PushDeviceMapper {
  static toDomain(raw: PushDeviceTypeormEntity): PushDeviceEntity {
    return PushDeviceEntity.reconstitute({
      id: raw.id,
      userId: raw.userId,
      token: raw.token,
      platform: raw.platform,
      lastSeenAt: raw.lastSeenAt,
      revokedAt: raw.revokedAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      isDeleted: raw.isDeleted,
    });
  }
}
