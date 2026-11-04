import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { UNREAD_COUNTED_MESSAGE_TYPES } from 'modules/message/domain/constants/unread-counted-message-types.constant';
import { ConversationMemberStatus } from 'modules/conversation-member/domain/enums/conversation-member-status.enum';
import { ConversationParticipantType } from 'modules/conversation-member/domain/enums/conversation-participant-type.enum';
import { ConversationMemberMapper } from 'modules/conversation-member/infrastructure/persistence/mappers/conversation-member.mapper';
import { ConversationMemberTypeormEntity } from 'modules/conversation-member/infrastructure/persistence/conversation-member.typeorm-entity';
import {
  ConversationDetailQueryPort,
  ConversationDetailQueryResult,
} from '../../application/ports/conversation-detail-query.port';
import { ConversationMapper } from '../persistence/mappers/conversation.mapper';
import { ConversationTypeormEntity } from '../persistence/conversation.typeorm-entity';

interface CountResult {
  count: string;
}

@Injectable()
export class TypeOrmConversationDetailQuery implements ConversationDetailQueryPort {
  constructor(
    @InjectRepository(ConversationTypeormEntity)
    private readonly conversations: Repository<ConversationTypeormEntity>,
    @InjectRepository(ConversationMemberTypeormEntity)
    private readonly members: Repository<ConversationMemberTypeormEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findDetailForUser(
    conversationId: Uuid,
    userId: Uuid,
  ): Promise<ConversationDetailQueryResult | null> {
    const conversationRow = await this.conversations.findOne({
      where: { id: conversationId, isDeleted: false },
    });
    if (!conversationRow) return null;

    const currentMemberRow = await this.members.findOne({
      where: {
        conversationId,
        participantType: ConversationParticipantType.USER,
        userId,
        isDeleted: false,
      },
    });
    if (!currentMemberRow) {
      return {
        conversation: ConversationMapper.toDomain(conversationRow),
        currentMember: null,
        members: [],
        unreadCount: 0,
      };
    }

    const unreadRows = (await this.dataSource.query(
      `SELECT COUNT(*)::text AS count
       FROM messages
       WHERE conversation_id = $1
         AND is_deleted = false
         AND sequence > $2::bigint
         AND sequence <= COALESCE($3::bigint, 9223372036854775807::bigint)
         AND sender_member_id <> $4
         AND message_type = ANY($5::text[])`,
      [
        conversationId,
        currentMemberRow.lastReadSequence,
        currentMemberRow.status === ConversationMemberStatus.READ_ONLY
          ? currentMemberRow.leftSequence
          : null,
        currentMemberRow.id,
        UNREAD_COUNTED_MESSAGE_TYPES,
      ],
    )) as CountResult[];
    const memberRows = await this.members.find({
      where: { conversationId, isDeleted: false },
      order: { joinedAt: 'ASC', createdAt: 'ASC' },
    });

    return {
      conversation: ConversationMapper.toDomain(conversationRow),
      currentMember: ConversationMemberMapper.toDomain(currentMemberRow),
      members: memberRows.map(ConversationMemberMapper.toDomain),
      unreadCount: Number(unreadRows[0]?.count ?? 0),
    };
  }
}
