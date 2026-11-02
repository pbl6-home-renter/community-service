import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { PushDeviceEntity } from '../../domain/entities/push-device.entity';
import { PushDeviceRepository } from '../../domain/repositories/push-device.repository';
import { PUSH_DEVICE_DI_TOKEN } from '../../push-device.di-token';
import { PushDeviceRegisterCommand } from './push-device-register.command';

@CommandHandler(PushDeviceRegisterCommand)
export class PushDeviceRegisterCommandHandler implements ICommandHandler<
  PushDeviceRegisterCommand,
  PushDeviceEntity
> {
  constructor(
    @Inject(PUSH_DEVICE_DI_TOKEN.REPOSITORY)
    private readonly devices: PushDeviceRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN) private readonly unitOfWork: IUnitOfWork,
  ) {}
  execute(command: PushDeviceRegisterCommand): Promise<PushDeviceEntity> {
    return this.unitOfWork.run((context) =>
      this.devices.register(command.userId, command.token, new Date(), context),
    );
  }
}
