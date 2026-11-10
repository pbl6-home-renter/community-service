import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { IntegrationEvent } from 'shared/application/messaging/integration-event';
import { ConsumerRegistry } from 'shared/infrastructure/messaging/rabbitmq/consumer/consumer-registry';
import { ContractMembershipLinkCommand } from '../../application/commands/contract-membership-link/contract-membership-link.command';
import { ContractMemberLinkedEventValidator } from './contract-member-linked.integration-event';
import {
  CONTRACT_CONTEXT_CONSUMER_NAME,
  CONTRACT_CONTEXT_CONSUMER_QUEUE,
  CONTRACT_MEMBER_LINKED_EVENT,
} from './contract-context-consumer.constants';

@Injectable()
export class ContractContextSubscriber {
  constructor(private readonly commands: CommandBus) {}

  @RabbitSubscribe({
    name: ConsumerRegistry.define({
      name: CONTRACT_CONTEXT_CONSUMER_NAME,
      queue: CONTRACT_CONTEXT_CONSUMER_QUEUE,
      routingKeys: [CONTRACT_MEMBER_LINKED_EVENT],
    }),
  })
  async handle(event: IntegrationEvent): Promise<void> {
    ContractMemberLinkedEventValidator.assert(event);
    await this.commands.execute<ContractMembershipLinkCommand, void>(
      new ContractMembershipLinkCommand(
        event.id,
        event.eventType,
        event.payload.contractId,
        event.payload.tenantUserId,
      ),
    );
  }
}
