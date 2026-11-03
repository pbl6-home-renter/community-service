import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationCategory } from 'modules/notification-preference/domain/enums/notification-category.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { PUSH_DEVICE_DI_TOKEN } from '../../push-device.di-token';
import { FcmMessageSenderPort } from '../ports/fcm-message-sender.port';
import { PushDeliveryPort, PushMessage } from '../ports/push-delivery.port';
import { PushDeliveryTargetQueryPort } from '../ports/push-delivery-target-query.port';

@Injectable()
export class PushDeliveryService implements PushDeliveryPort {
  private readonly logger = new Logger(PushDeliveryService.name);

  constructor(
    @Inject(PUSH_DEVICE_DI_TOKEN.DELIVERY_TARGET_QUERY)
    private readonly targets: PushDeliveryTargetQueryPort,
    @Inject(PUSH_DEVICE_DI_TOKEN.FCM_MESSAGE_SENDER)
    private readonly sender: FcmMessageSenderPort,
  ) {}

  async sendToUsers(
    userIds: Uuid[],
    category: NotificationCategory,
    message: PushMessage,
  ): Promise<void> {
    try {
      const devices = await this.targets.findEnabledTargets(
        [...new Set(userIds)],
        category,
      );
      await Promise.all(
        devices.map(async (device) => {
          try {
            const result = await this.sender.send(device.token, message);
            if (result === 'unregistered') {
              await this.targets.revokeDevice(device.deviceId, new Date());
            }
          } catch (error) {
            this.logger.warn(
              `Push delivery failed for device ${device.deviceId}: ${String(error)}`,
            );
          }
        }),
      );
    } catch (error) {
      this.logger.warn(`Push recipient lookup failed: ${String(error)}`);
    }
  }
}
