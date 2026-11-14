import { ICommand } from '@nestjs/cqrs';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class IssueReportCancelCommand implements ICommand {
  constructor(
    readonly actor: AuthenticatedUser,
    readonly issueId: Uuid,
  ) {}
}
