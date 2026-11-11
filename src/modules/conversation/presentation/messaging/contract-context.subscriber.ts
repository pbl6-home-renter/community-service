import { Inject, Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { InboxRepository } from 'modules/inbox/application/ports/inbox.repository';
import { INBOX_DI_TOKEN } from 'modules/inbox/inbox.di-token';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { ConsumerRegistry } from 'shared/infrastructure/messaging/rabbitmq/consumer/consumer-registry';
import {
  ContractContextApplyCommand,
  ContractMembershipChange,
} from '../../application/commands/contract-context-apply/contract-context-apply.command';
import { ChatRealtimePort } from '../../application/ports/chat-realtime.port';
import { CONVERSATION_DI_TOKEN } from '../../conversation.di-token';
import {
  CONTRACT_ACTIVATED_EVENT,
  CONTRACT_CONTEXT_CONSUMER_NAME,
  CONTRACT_CONTEXT_CONSUMER_QUEUE,
  CONTRACT_MEMBER_ADDED_EVENT,
  CONTRACT_MEMBER_LEFT_EVENT,
  CONTRACT_MEMBER_LINKED_EVENT,
} from './contract-context-consumer.constants';
import {
  ContractContextEventValidator,
  ContractContextIntegrationEvent,
} from './contract-context.integration-event';

@Injectable()
export class ContractContextSubscriber {
  constructor(
    private readonly commandBus: CommandBus,
    @Inject(INBOX_DI_TOKEN.REPOSITORY)
    private readonly inbox: InboxRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(CONVERSATION_DI_TOKEN.CHAT_REALTIME)
    private readonly realtime: ChatRealtimePort,
  ) {}

  @RabbitSubscribe({
    name: ConsumerRegistry.define({
      name: CONTRACT_CONTEXT_CONSUMER_NAME,
      queue: CONTRACT_CONTEXT_CONSUMER_QUEUE,
      routingKeys: [
        CONTRACT_ACTIVATED_EVENT,
        CONTRACT_MEMBER_ADDED_EVENT,
        CONTRACT_MEMBER_LEFT_EVENT,
        CONTRACT_MEMBER_LINKED_EVENT,
      ],
    }),
  })
  async handle(raw: unknown): Promise<void> {
    ContractContextEventValidator.assert(raw);
    const changes = await this.handleOnce(raw, (context) =>
      this.commandBus.execute<
        ContractContextApplyCommand,
        ContractMembershipChange[]
      >(new ContractContextApplyCommand(raw, context)),
    );
    for (const change of changes) {
      if (change.active)
        this.realtime.membershipActivated(change.userId, change.conversationId);
      else
        this.realtime.membershipRevoked(change.userId, change.conversationId);
    }
  }

  private async handleOnce(
    event: ContractContextIntegrationEvent,
    sideEffect: (
      context: TransactionContext,
    ) => Promise<ContractMembershipChange[]>,
  ): Promise<ContractMembershipChange[]> {
    return this.unitOfWork.run(async (context) => {
      if (!(await this.inbox.recordIfNew(event.id, event.eventType, context))) {
        return [];
      }
      return sideEffect(context);
    });
  }
}
