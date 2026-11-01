import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { SampleCreateCommand } from './sample-create.command';
import { SAMPLE_DI_TOKEN } from '../../../sample.di-token';
import { SampleRepository } from '../../../domain/repositories/sample.repository';
import { SampleEntity } from '../../../domain/entities/sample.entity';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';

@CommandHandler(SampleCreateCommand)
export class SampleCreateCommandHandler implements ICommandHandler<
  SampleCreateCommand,
  SampleEntity
> {
  constructor(
    @Inject(SAMPLE_DI_TOKEN.REPOSITORY)
    private readonly sampleRepository: SampleRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outboxRepository: OutboxRepository,
  ) {}

  async execute(command: SampleCreateCommand): Promise<SampleEntity> {
    return this.unitOfWork.run(async (context) => {
      const sample = SampleEntity.create({
        title: command.title,
        description: command.description,
      });

      await this.sampleRepository.save(sample, context);
      await this.outboxRepository.append(
        sample
          .pullDomainEvents()
          .map((event) => OutboxMessage.fromDomainEvent(event)),
        context,
      );
      return sample;
    });
  }
}
