import { Inject, Injectable } from '@nestjs/common';
import { CONVERSATION_MEMBER_DI_TOKEN } from 'modules/conversation-member/conversation-member.di-token';
import { ConversationMemberStatus } from 'modules/conversation-member/domain/enums/conversation-member-status.enum';
import { ConversationParticipantType } from 'modules/conversation-member/domain/enums/conversation-participant-type.enum';
import { ConversationMemberRepository } from 'modules/conversation-member/domain/repositories/conversation-member.repository';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

@Injectable()
export class ConversationSocketAccessService {
  constructor(
    @Inject(CONVERSATION_MEMBER_DI_TOKEN.REPOSITORY)
    private readonly members: ConversationMemberRepository,
  ) {}

  async canJoin(conversationId: Uuid, userId: Uuid): Promise<boolean> {
    const member = await this.members.findByParticipant(conversationId, {
      participantType: ConversationParticipantType.USER,
      userId,
    });
    return member?.status === ConversationMemberStatus.ACTIVE;
  }
}
