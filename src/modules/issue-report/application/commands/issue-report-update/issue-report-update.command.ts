import { ICommand } from '@nestjs/cqrs';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IssueStatus } from '../../../domain/enums/issue-status.enum';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';

export class IssueReportUpdateCommand implements ICommand {
  constructor(
    readonly actor: AuthenticatedUser,
    readonly issueId: Uuid,
    readonly status?: IssueStatus,
    readonly assignedTo?: string | null,
    readonly repairCost?: number | null,
    readonly resolutionNote?: string | null,
  ) {
    if (
      status === undefined &&
      assignedTo === undefined &&
      repairCost === undefined &&
      resolutionNote === undefined
    ) {
      throw new ValidationException(
        'At least one issue update field is required',
      );
    }
  }
}
