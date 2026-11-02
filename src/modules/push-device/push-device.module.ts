import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushDeviceRegisterCommandHandler } from './application/commands/push-device-register.command.handler';
import { PushDeviceRevokeCommandHandler } from './application/commands/push-device-revoke.command.handler';
import { TypeOrmPushDeviceRepository } from './infrastructure/persistence/push-device.repository';
import { PushDeviceTypeormEntity } from './infrastructure/persistence/push-device.typeorm-entity';
import { PUSH_DEVICE_DI_TOKEN } from './push-device.di-token';
import { PushDeviceController } from './presentation/http/controllers/push-device.controller';

const commandHandlers = [
  PushDeviceRegisterCommandHandler,
  PushDeviceRevokeCommandHandler,
];
const queryHandlers: never[] = [];

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([PushDeviceTypeormEntity])],
  controllers: [PushDeviceController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    {
      provide: PUSH_DEVICE_DI_TOKEN.REPOSITORY,
      useClass: TypeOrmPushDeviceRepository,
    },
  ],
  exports: [PUSH_DEVICE_DI_TOKEN.REPOSITORY],
})
export class PushDeviceModule {}
