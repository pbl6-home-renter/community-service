import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationPreferenceModule } from 'modules/notification-preference/notification-preference.module';
import { PushDeviceRegisterCommandHandler } from './application/commands/push-device-register.command.handler';
import { PushDeviceRevokeCommandHandler } from './application/commands/push-device-revoke.command.handler';
import { TypeOrmPushDeviceRepository } from './infrastructure/persistence/push-device.repository';
import { PushDeviceTypeormEntity } from './infrastructure/persistence/push-device.typeorm-entity';
import { PUSH_DEVICE_DI_TOKEN } from './push-device.di-token';
import { PushDeviceController } from './presentation/http/controllers/push-device.controller';
import { FirebaseCloudMessagingSender } from './infrastructure/delivery/firebase-cloud-messaging.sender';
import { TypeOrmPushDeliveryTargetQuery } from './infrastructure/queries/typeorm-push-delivery-target.query';
import { PushDeliveryService } from './application/services/push-delivery.service';

const commandHandlers = [
  PushDeviceRegisterCommandHandler,
  PushDeviceRevokeCommandHandler,
];
const queryHandlers: never[] = [];

@Module({
  imports: [
    CqrsModule,
    NotificationPreferenceModule,
    TypeOrmModule.forFeature([PushDeviceTypeormEntity]),
  ],
  controllers: [PushDeviceController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    PushDeliveryService,
    FirebaseCloudMessagingSender,
    TypeOrmPushDeliveryTargetQuery,
    {
      provide: PUSH_DEVICE_DI_TOKEN.DELIVERY,
      useExisting: PushDeliveryService,
    },
    {
      provide: PUSH_DEVICE_DI_TOKEN.FCM_MESSAGE_SENDER,
      useExisting: FirebaseCloudMessagingSender,
    },
    {
      provide: PUSH_DEVICE_DI_TOKEN.DELIVERY_TARGET_QUERY,
      useExisting: TypeOrmPushDeliveryTargetQuery,
    },
    {
      provide: PUSH_DEVICE_DI_TOKEN.REPOSITORY,
      useClass: TypeOrmPushDeviceRepository,
    },
  ],
  exports: [PUSH_DEVICE_DI_TOKEN.REPOSITORY, PUSH_DEVICE_DI_TOKEN.DELIVERY],
})
export class PushDeviceModule {}
