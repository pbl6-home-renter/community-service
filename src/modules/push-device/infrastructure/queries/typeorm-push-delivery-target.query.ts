import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { NotificationCategory } from 'modules/notification-preference/domain/enums/notification-category.enum';
import { NotificationPreferenceRepository } from 'modules/notification-preference/domain/repositories/notification-preference.repository';
import { NOTIFICATION_PREFERENCE_DI_TOKEN } from 'modules/notification-preference/notification-preference.di-token';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  PushDeliveryTarget,
  PushDeliveryTargetQueryPort,
} from '../../application/ports/push-delivery-target-query.port';
import { PushDeviceTypeormEntity } from '../persistence/push-device.typeorm-entity';

@Injectable()
export class TypeOrmPushDeliveryTargetQuery implements PushDeliveryTargetQueryPort {
  constructor(
    @InjectRepository(PushDeviceTypeormEntity)
    private readonly devices: Repository<PushDeviceTypeormEntity>,
    @Inject(NOTIFICATION_PREFERENCE_DI_TOKEN.REPOSITORY)
    private readonly preferences: NotificationPreferenceRepository,
  ) {}

  async findEnabledTargets(
    userIds: Uuid[],
    category: NotificationCategory,
  ): Promise<PushDeliveryTarget[]> {
    if (userIds.length === 0) return [];
    const [devices, preferences] = await Promise.all([
      this.devices.find({
        where: {
          userId: In(userIds),
          revokedAt: IsNull(),
          isDeleted: false,
        },
      }),
      this.preferences.findByUserIds(userIds),
    ]);
    const preferenceByUser = new Map(
      preferences
        .filter((preference) => preference.category === category)
        .map((preference) => [preference.userId, preference.pushEnabled]),
    );
    return devices
      .filter((device) => preferenceByUser.get(device.userId) !== false)
      .map((device) => ({
        deviceId: device.id,
        userId: device.userId,
        token: device.token,
      }));
  }

  async revokeDevice(deviceId: Uuid, at: Date): Promise<void> {
    await this.devices.update(
      { id: deviceId, revokedAt: IsNull(), isDeleted: false },
      { revokedAt: at, updatedAt: at },
    );
  }
}
