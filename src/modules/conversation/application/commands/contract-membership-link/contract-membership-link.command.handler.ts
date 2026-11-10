import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { INBOX_DI_TOKEN } from 'modules/inbox/inbox.di-token';
import { InboxRepository } from 'modules/inbox/application/ports/inbox.repository';
import { CONVERSATION_MEMBER_DI_TOKEN } from 'modules/conversation-member/conversation-member.di-token';
import { ConversationMemberRepository } from 'modules/conversation-member/domain/repositories/conversation-member.repository';
import { ConversationMemberEntity } from 'modules/conversation-member/domain/entities/conversation-member.entity';
import { ConversationParticipantType } from 'modules/conversation-member/domain/enums/conversation-participant-type.enum';
import { ConversationMemberRole } from 'modules/conversation-member/domain/enums/conversation-member-role.enum';
import { ConversationMemberStatus } from 'modules/conversation-member/domain/enums/conversation-member-status.enum';
import { MESSAGE_DI_TOKEN } from 'modules/message/message.di-token';
import { MessageRepository } from 'modules/message/domain/repositories/message.repository';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { CONVERSATION_DI_TOKEN } from '../../../conversation.di-token';
import { ConversationRepository } from '../../../domain/repositories/conversation.repository';
import { ConversationContextType } from '../../../domain/enums/conversation-context-type.enum';
import { ConversationKind } from '../../../domain/enums/conversation-kind.enum';
import { ConversationNotFoundException } from '../../../domain/exceptions/conversation-not-found.exception';
import { ChatRealtimePort } from '../../ports/chat-realtime.port';
import { ContractMembershipLinkCommand } from './contract-membership-link.command';

@CommandHandler(ContractMembershipLinkCommand)
export class ContractMembershipLinkCommandHandler implements ICommandHandler<
  ContractMembershipLinkCommand,
  void
> {
  constructor(
    @Inject(CONVERSATION_DI_TOKEN.REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(CONVERSATION_MEMBER_DI_TOKEN.REPOSITORY)
    private readonly members: ConversationMemberRepository,
    @Inject(MESSAGE_DI_TOKEN.REPOSITORY)
    private readonly messages: MessageRepository,
    @Inject(INBOX_DI_TOKEN.REPOSITORY)
    private readonly inbox: InboxRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(CONVERSATION_DI_TOKEN.CHAT_REALTIME)
    private readonly realtime: ChatRealtimePort,
  ) {}

  async execute(command: ContractMembershipLinkCommand): Promise<void> {
    const conversationId = await this.unitOfWork.run(async (context) => {
      const isNew = await this.inbox.recordIfNew(
        command.eventId,
        command.eventType,
        context,
      );
      if (!isNew) return null;

      const conversation = await this.conversations.findByContextForUpdate(
        ConversationContextType.CONTRACT,
        command.contractId,
        context,
      );
      if (!conversation) throw new ConversationNotFoundException();
      if (conversation.kind !== ConversationKind.GROUP) {
        throw new ValidationException(
          'Contract conversation context must be a group',
        );
      }
      const existing = await this.members.findByParticipantForUpdate(
        conversation.id,
        {
          participantType: ConversationParticipantType.USER,
          userId: command.tenantUserId,
        },
        context,
      );
      if (existing?.status === ConversationMemberStatus.ACTIVE) return null;

      const latestSequence = await this.messages.latestSequenceForUpdate(
        conversation.id,
        context,
      );
      if (existing) {
        existing.reactivate(new Date(), latestSequence, existing.displayName);
        await this.members.save(existing, context);
      } else {
        const member = ConversationMemberEntity.create({
          conversationId: conversation.id,
          participantType: ConversationParticipantType.USER,
          userId: command.tenantUserId,
          displayName: 'Tenant',
          role: ConversationMemberRole.MEMBER,
          lastReadSequence: latestSequence,
        });
        await this.members.save(member, context);
      }
      return conversation.id;
    });
    if (conversationId)
      this.realtime.membershipActivated(command.tenantUserId, conversationId);
  }
}
