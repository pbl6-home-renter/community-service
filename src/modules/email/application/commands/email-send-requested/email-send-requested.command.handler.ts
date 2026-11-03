import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { EMAIL_DI_TOKEN } from '../../../email.di-token';
import { EmailDeliveryRepository } from '../../../domain/repositories/email-delivery.repository';
import { EmailDelivery } from '../../../domain/entities/email-delivery.entity';
import { EmailSenderPort } from '../../ports/email-sender.port';
import { EmailSendRequestedCommand } from './email-send-requested.command';

@CommandHandler(EmailSendRequestedCommand)
export class EmailSendRequestedCommandHandler implements ICommandHandler<
  EmailSendRequestedCommand,
  void
> {
  private readonly logger = new Logger(EmailSendRequestedCommandHandler.name);

  constructor(
    @Inject(EMAIL_DI_TOKEN.DELIVERY_REPOSITORY)
    private readonly deliveries: EmailDeliveryRepository,
    @Inject(EMAIL_DI_TOKEN.SENDER)
    private readonly sender: EmailSenderPort,
  ) {}

  async execute(command: EmailSendRequestedCommand): Promise<void> {
    const delivery = EmailDelivery.create({
      id: command.emailRequestId,
      recipientEmail: command.message.to,
      subject: command.message.subject,
    });

    if (!(await this.deliveries.recordIfNew(delivery))) return;

    try {
      await this.sender.send(command.message);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      delivery.markFailed(reason);
      await this.deliveries.save(delivery);
      this.logger.error(
        `Email request ${command.emailRequestId} failed: ${reason}`,
      );
      return;
    }

    delivery.markSent(new Date());
    await this.deliveries.save(delivery);
  }
}
