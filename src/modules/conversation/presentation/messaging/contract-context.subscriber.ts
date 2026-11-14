import { Injectable } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ConsumerRegistry } from 'shared/infrastructure/messaging/rabbitmq/consumer/consumer-registry';
import { ContractContextEventHandler } from './contract-context-event.handler';
import {
  CONTRACT_CONTEXT_CONSUMER_NAME,
  CONTRACT_CONTEXT_CONSUMER_QUEUE,
  CONTRACT_ACTIVATED_EVENT,
  CONTRACT_MEMBER_LEFT_EVENT,
  CONTRACT_MEMBER_LINKED_EVENT,
} from './contract-context-consumer.constants';

@Injectable()
export class ContractContextSubscriber {
  constructor(private readonly events: ContractContextEventHandler) {}

  @RabbitSubscribe({
    name: ConsumerRegistry.define({
      name: CONTRACT_CONTEXT_CONSUMER_NAME,
      queue: CONTRACT_CONTEXT_CONSUMER_QUEUE,
      routingKeys: [
        CONTRACT_ACTIVATED_EVENT,
        CONTRACT_MEMBER_LEFT_EVENT,
        CONTRACT_MEMBER_LINKED_EVENT,
      ],
    }),
  })
  async handle(event: unknown): Promise<void> {
    await this.events.handle(event);
  }
}
