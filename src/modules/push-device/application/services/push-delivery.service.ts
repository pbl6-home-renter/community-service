import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationCategory } from 'modules/notification-preference/domain/enums/notification-category.enum';
import { PUSH_DEVICE_DI_TOKEN } from '../../push-device.di-token';
import { FcmMessageSenderPort } from '../ports/fcm-message-sender.port';
import {
  PushDeliveryPort,
  PushRecipientMessage,
} from '../ports/push-delivery.port';
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

  async send(
    category: NotificationCategory,
    recipients: PushRecipientMessage[],
  ): Promise<void> {
    if (recipients.length === 0 || !this.sender.isEnabled()) return;
    try {
      const messageByUser = new Map(
        recipients.map((recipient) => [recipient.userId, recipient.message]),
      );
      const devices = await this.targets.findEnabledTargets(
        [...messageByUser.keys()],
        category,
      );
      await Promise.all(
        devices.map(async (device) => {
          try {
            const result = await this.sender.send(
              device.token,
              messageByUser.get(device.userId)!,
            );
            if (result === 'invalid-token') {
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
