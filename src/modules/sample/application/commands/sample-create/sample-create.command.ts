import { ICommand } from '@nestjs/cqrs';

export class SampleCreateCommand implements ICommand {
  constructor(
    public readonly title: string,
    public readonly description?: string,
  ) {}
}
