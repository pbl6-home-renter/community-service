import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ArrayContains, Repository } from 'typeorm';
import { ConversationMemberStatus } from 'modules/conversation-member/domain/enums/conversation-member-status.enum';
import { ConversationParticipantType } from 'modules/conversation-member/domain/enums/conversation-participant-type.enum';
import { ConversationMemberTypeormEntity } from 'modules/conversation-member/infrastructure/persistence/conversation-member.typeorm-entity';
import { MessageTypeormEntity } from 'modules/message/infrastructure/persistence/message.typeorm-entity';
import { ConversationMediaOwnershipQueryPort } from '../../application/ports/conversation-media-ownership-query.port';
import { ConversationTypeormEntity } from '../persistence/conversation.typeorm-entity';

@Injectable()
export class TypeOrmConversationMediaOwnershipQuery implements ConversationMediaOwnershipQueryPort {
  constructor(
    @InjectRepository(ConversationTypeormEntity)
    private readonly conversations: Repository<ConversationTypeormEntity>,
    @InjectRepository(ConversationMemberTypeormEntity)
    private readonly members: Repository<ConversationMemberTypeormEntity>,
    @InjectRepository(MessageTypeormEntity)
    private readonly messages: Repository<MessageTypeormEntity>,
  ) {}

  async findForUser(conversationId: Uuid, actorUserId: Uuid, mediaId?: Uuid) {
    const conversation = await this.conversations.findOne({
      where: { id: conversationId, isDeleted: false },
      select: { id: true },
    });
    if (!conversation) return null;

    const member = await this.members.findOne({
      where: {
        conversationId,
        participantType: ConversationParticipantType.USER,
        userId: actorUserId,
        isDeleted: false,
      },
      select: { id: true, status: true, leftSequence: true },
    });

    let authorized = member?.status === ConversationMemberStatus.ACTIVE;
    if (mediaId && member) {
      const messages = await this.messages.find({
        where: {
          conversationId,
          mediaIds: ArrayContains([mediaId]),
          isDeleted: false,
        },
        select: { sequence: true },
      });
      authorized = messages.some(
        (message) =>
          member.status === ConversationMemberStatus.ACTIVE ||
          (member.status === ConversationMemberStatus.READ_ONLY &&
            member.leftSequence !== null &&
            BigInt(message.sequence) <= BigInt(member.leftSequence)),
      );
    }

    return {
      landlordId: null,
      participantUserIds: authorized ? [actorUserId] : [],
      status: null,
    };
  }
}
