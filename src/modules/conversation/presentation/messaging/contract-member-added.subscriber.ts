import { Injectable } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ConsumerRegistry } from 'shared/infrastructure/messaging/rabbitmq/consumer/consumer-registry';
import { ContractContextEventHandler } from './contract-context-event.handler';
import {
  CONTRACT_MEMBER_ADDED_CONSUMER_NAME,
  CONTRACT_MEMBER_ADDED_CONSUMER_QUEUE,
  CONTRACT_MEMBER_ADDED_EVENT,
} from './contract-context-consumer.constants';

@Injectable()
export class ContractMemberAddedSubscriber {
  constructor(private readonly events: ContractContextEventHandler) {}

  @RabbitSubscribe({
    name: ConsumerRegistry.define({
      name: CONTRACT_MEMBER_ADDED_CONSUMER_NAME,
      queue: CONTRACT_MEMBER_ADDED_CONSUMER_QUEUE,
      routingKeys: [CONTRACT_MEMBER_ADDED_EVENT],
    }),
  })
  async handle(event: unknown): Promise<void> {
    await this.events.handle(event);
  }
}
