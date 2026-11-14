import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { IssueReportEntity } from '../../../domain/entities/issue-report.entity';
import { IssueReportForbiddenException } from '../../../domain/exceptions/issue-report-forbidden.exception';
import { IssueReportRoomNotFoundException } from '../../../domain/exceptions/issue-report-room-not-found.exception';
import { IssueReportRepository } from '../../../domain/repositories/issue-report.repository';
import { ISSUE_REPORT_DI_TOKEN } from '../../../issue-report.di-token';
import {
  ISSUE_CONTEXT_PORT,
  IssueContextPort,
} from '../../ports/issue-context.port';
import { IssueAccessService } from '../../services/issue-access.service';
import { IssueNotificationService } from '../../services/issue-notification.service';
import { IssueReportCreateCommand } from './issue-report-create.command';

@CommandHandler(IssueReportCreateCommand)
export class IssueReportCreateCommandHandler implements ICommandHandler<IssueReportCreateCommand> {
  constructor(
    @Inject(ISSUE_CONTEXT_PORT) private readonly contexts: IssueContextPort,
    @Inject(ISSUE_REPORT_DI_TOKEN.REPOSITORY)
    private readonly reports: IssueReportRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN) private readonly unitOfWork: IUnitOfWork,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outbox: OutboxRepository,
  ) {}

  async execute(command: IssueReportCreateCommand): Promise<IssueReportEntity> {
    const context = await this.contexts.byRoom(command.roomId);
    if (!context || context.contractStatus !== 'active')
      throw new IssueReportRoomNotFoundException();
    if (!IssueAccessService.canView(command.actor, context))
      throw new IssueReportForbiddenException();
    const issue = IssueReportEntity.create({
      roomId: context.roomId,
      buildingId: context.buildingId,
      contractId: context.contractId,
      creatorId: command.actor.id,
      title: command.title,
      description: command.description,
      category: command.category,
      urgency: command.urgency,
    });
    const event = IssueNotificationService.event(
      issue.id,
      command.actor.id,
      context,
      'issue.created',
    );
    return this.unitOfWork.run(async (transaction) => {
      await this.reports.save(issue, transaction);
      if (event)
        await this.outbox.append(
          [OutboxMessage.fromDomainEvent(event)],
          transaction,
        );
      return issue;
    });
  }
}
