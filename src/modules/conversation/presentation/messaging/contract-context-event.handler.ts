import { Inject, Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { InboxRepository } from 'modules/inbox/application/ports/inbox.repository';
import { INBOX_DI_TOKEN } from 'modules/inbox/inbox.di-token';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import {
  ContractContextApplyCommand,
  ContractMembershipChange,
} from '../../application/commands/contract-context-apply/contract-context-apply.command';
import { ChatRealtimePort } from '../../application/ports/chat-realtime.port';
import { CONVERSATION_DI_TOKEN } from '../../conversation.di-token';
import {
  ContractContextEventValidator,
  ContractContextIntegrationEvent,
} from './contract-context.integration-event';

@Injectable()
export class ContractContextEventHandler {
  constructor(
    private readonly commandBus: CommandBus,
    @Inject(INBOX_DI_TOKEN.REPOSITORY)
    private readonly inbox: InboxRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(CONVERSATION_DI_TOKEN.CHAT_REALTIME)
    private readonly realtime: ChatRealtimePort,
  ) {}

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
