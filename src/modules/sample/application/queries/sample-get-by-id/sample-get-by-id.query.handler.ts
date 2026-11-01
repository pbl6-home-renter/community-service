import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { SampleGetByIdQuery } from './sample-get-by-id.query';
import { SAMPLE_DI_TOKEN } from '../../../sample.di-token';
import { SampleRepository } from '../../../domain/repositories/sample.repository';
import { SampleEntity } from '../../../domain/entities/sample.entity';
import { SampleNotFoundException } from '../../../domain/exceptions/sample-not-found.exception';

@QueryHandler(SampleGetByIdQuery)
export class SampleGetByIdQueryHandler implements IQueryHandler<
  SampleGetByIdQuery,
  SampleEntity
> {
  constructor(
    @Inject(SAMPLE_DI_TOKEN.REPOSITORY)
    private readonly sampleRepository: SampleRepository,
  ) {}

  async execute(query: SampleGetByIdQuery): Promise<SampleEntity> {
    const sample = await this.sampleRepository.findById(query.id);
    if (!sample) {
      throw new SampleNotFoundException(query.id);
    }
    return sample;
  }
}
