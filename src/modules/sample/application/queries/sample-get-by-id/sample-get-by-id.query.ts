import { IQuery } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class SampleGetByIdQuery implements IQuery {
  constructor(public readonly id: Uuid) {}
}
