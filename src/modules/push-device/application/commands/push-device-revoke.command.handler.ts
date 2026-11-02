import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { PushDeviceNotFoundException } from '../../domain/exceptions/push-device-not-found.exception';
import { PushDeviceRepository } from '../../domain/repositories/push-device.repository';
import { PUSH_DEVICE_DI_TOKEN } from '../../push-device.di-token';
import { PushDeviceRevokeCommand } from './push-device-revoke.command';

@CommandHandler(PushDeviceRevokeCommand)
export class PushDeviceRevokeCommandHandler implements ICommandHandler<
  PushDeviceRevokeCommand,
  void
> {
  constructor(
    @Inject(PUSH_DEVICE_DI_TOKEN.REPOSITORY)
    private readonly devices: PushDeviceRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN) private readonly unitOfWork: IUnitOfWork,
  ) {}
  async execute(command: PushDeviceRevokeCommand): Promise<void> {
    const revoked = await this.unitOfWork.run((context) =>
      this.devices.revoke(
        command.userId,
        command.deviceId,
        new Date(),
        context,
      ),
    );
    if (!revoked) throw new PushDeviceNotFoundException();
  }
}
