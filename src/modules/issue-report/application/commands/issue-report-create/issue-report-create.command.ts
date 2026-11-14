import { ICommand } from '@nestjs/cqrs';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IssueCategory } from '../../../domain/enums/issue-category.enum';
import { IssueUrgency } from '../../../domain/enums/issue-urgency.enum';

export class IssueReportCreateCommand implements ICommand {
  constructor(
    readonly actor: AuthenticatedUser,
    readonly roomId: Uuid,
    readonly title: string,
    readonly description: string | null,
    readonly category: IssueCategory,
    readonly urgency: IssueUrgency,
  ) {}
}
