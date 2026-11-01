import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { SampleDeleteCommand } from './sample-delete.command';
import { SAMPLE_DI_TOKEN } from '../../../sample.di-token';
import { SampleRepository } from '../../../domain/repositories/sample.repository';
import { SampleNotFoundException } from '../../../domain/exceptions/sample-not-found.exception';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';

@CommandHandler(SampleDeleteCommand)
export class SampleDeleteCommandHandler implements ICommandHandler<
  SampleDeleteCommand,
  void
> {
  constructor(
    @Inject(SAMPLE_DI_TOKEN.REPOSITORY)
    private readonly sampleRepository: SampleRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outboxRepository: OutboxRepository,
  ) {}

  async execute(command: SampleDeleteCommand): Promise<void> {
    await this.unitOfWork.run(async (context) => {
      const sample = await this.sampleRepository.findByIdForUpdate(
        command.id,
        context,
      );
      if (!sample) {
        throw new SampleNotFoundException(command.id);
      }

      sample.delete();

      await this.sampleRepository.save(sample, context);
      await this.outboxRepository.append(
        sample
          .pullDomainEvents()
          .map((event) => OutboxMessage.fromDomainEvent(event)),
        context,
      );
    });
  }
}
