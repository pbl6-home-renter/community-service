import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { IssueReportEntity } from '../../../domain/entities/issue-report.entity';
import { IssueReportForbiddenException } from '../../../domain/exceptions/issue-report-forbidden.exception';
import { IssueReportNotFoundException } from '../../../domain/exceptions/issue-report-not-found.exception';
import { IssueReportRepository } from '../../../domain/repositories/issue-report.repository';
import { ISSUE_REPORT_DI_TOKEN } from '../../../issue-report.di-token';
import {
  ISSUE_CONTEXT_PORT,
  IssueContextPort,
} from '../../ports/issue-context.port';
import { IssueAccessService } from '../../services/issue-access.service';
import { IssueNotificationService } from '../../services/issue-notification.service';
import { IssueReportUpdateCommand } from './issue-report-update.command';

@CommandHandler(IssueReportUpdateCommand)
export class IssueReportUpdateCommandHandler implements ICommandHandler<IssueReportUpdateCommand> {
  constructor(
    @Inject(ISSUE_CONTEXT_PORT) private readonly contexts: IssueContextPort,
    @Inject(ISSUE_REPORT_DI_TOKEN.REPOSITORY)
    private readonly reports: IssueReportRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN) private readonly unitOfWork: IUnitOfWork,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outbox: OutboxRepository,
  ) {}

  execute(command: IssueReportUpdateCommand): Promise<IssueReportEntity> {
    return this.unitOfWork.run(async (transaction) => {
      const issue = await this.reports.findByIdForUpdate(
        command.issueId,
        transaction,
      );
      if (!issue) throw new IssueReportNotFoundException();
      const context = await this.contexts.byContract(issue.contractId);
      if (
        !context ||
        context.roomId !== issue.roomId ||
        !IssueAccessService.canManage(command.actor, context)
      )
        throw new IssueReportForbiddenException();
      const detailsChanged = issue.updateDetails({
        assignedTo: command.assignedTo,
        repairCost: command.repairCost,
        resolutionNote: command.resolutionNote,
      });
      const statusChanged =
        command.status !== undefined && issue.advance(command.status);
      if (detailsChanged || statusChanged) {
        await this.reports.save(issue, transaction);
        const event = IssueNotificationService.event(
          issue.id,
          command.actor.id,
          context,
          'issue.updated',
        );
        if (event)
          await this.outbox.append(
            [OutboxMessage.fromDomainEvent(event)],
            transaction,
          );
      }
      return issue;
    });
  }
}
