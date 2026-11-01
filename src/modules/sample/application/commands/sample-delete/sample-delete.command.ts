import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class SampleDeleteCommand implements ICommand {
  constructor(public readonly id: Uuid) {}
}
