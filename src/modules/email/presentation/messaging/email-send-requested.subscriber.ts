import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ConsumerRegistry } from 'shared/infrastructure/messaging/rabbitmq/consumer/consumer-registry';
import { EmailSendRequestedCommand } from '../../application/commands/email-send-requested/email-send-requested.command';
import {
  EMAIL_CONSUMER_NAME,
  EMAIL_CONSUMER_QUEUE,
  EMAIL_INTEGRATION_EVENTS,
} from './email-consumer.constants';
import {
  EmailSendRequestedEventValidator,
  EmailSendRequestedIntegrationEvent,
} from './email-send-requested.integration-event';

@Injectable()
export class EmailSendRequestedSubscriber {
  constructor(private readonly commandBus: CommandBus) {}

  @RabbitSubscribe({
    name: ConsumerRegistry.define({
      name: EMAIL_CONSUMER_NAME,
      queue: EMAIL_CONSUMER_QUEUE,
      routingKeys: [EMAIL_INTEGRATION_EVENTS.SEND_REQUESTED],
    }),
  })
  async handle(event: unknown): Promise<void> {
    EmailSendRequestedEventValidator.assert(event);
    const request = event as EmailSendRequestedIntegrationEvent;
    await this.commandBus.execute(
      new EmailSendRequestedCommand(request.payload.emailRequestId, {
        to: request.payload.to,
        subject: request.payload.subject,
        text: request.payload.text,
        html: request.payload.html,
      }),
    );
  }
}
