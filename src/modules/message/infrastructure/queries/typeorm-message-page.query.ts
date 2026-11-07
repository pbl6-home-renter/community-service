import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CursorPaginatedResult } from 'shared/application/pagination/cursor-paginated-result';
import { TypeOrmCursorPaginator } from 'shared/infrastructure/database/pagination/typeorm-cursor.paginator';
import { ConversationMemberTypeormEntity } from 'modules/conversation-member/infrastructure/persistence/conversation-member.typeorm-entity';
import { ConversationParticipantType } from 'modules/conversation-member/domain/enums/conversation-participant-type.enum';
import { ConversationMemberStatus } from 'modules/conversation-member/domain/enums/conversation-member-status.enum';
import {
  MessagePageQuery,
  MessagePageQueryPort,
  MessageReadModel,
} from '../../application/ports/message-page-query.port';
import { MessageTypeormEntity } from '../persistence/message.typeorm-entity';

@Injectable()
export class TypeOrmMessagePageQuery implements MessagePageQueryPort {
  constructor(
    @InjectRepository(MessageTypeormEntity)
    private readonly messages: Repository<MessageTypeormEntity>,
    @InjectRepository(ConversationMemberTypeormEntity)
    private readonly members: Repository<ConversationMemberTypeormEntity>,
  ) {}

  async findPage(
    query: MessagePageQuery,
  ): Promise<CursorPaginatedResult<MessageReadModel>> {
    const builder = this.messages
      .createQueryBuilder('message')
      .where('message.conversationId = :conversationId', {
        conversationId: query.conversationId,
      })
      .andWhere('message.isDeleted = false');

    builder.andWhere(
      `EXISTS (
        SELECT 1
        FROM conversation_members visible_member
        WHERE visible_member.conversation_id = message.conversation_id
          AND visible_member.participant_type = :participantType
          AND visible_member.user_id = :actorUserId
          AND visible_member.is_deleted = false
          AND (
            visible_member.status = :activeStatus
            OR (
              visible_member.status = :readOnlyStatus
              AND message.sequence <= visible_member.left_sequence
            )
          )
      )`,
      {
        participantType: ConversationParticipantType.USER,
        actorUserId: query.actorUserId,
        activeStatus: ConversationMemberStatus.ACTIVE,
        readOnlyStatus: ConversationMemberStatus.READ_ONLY,
      },
    );

    if (query.maxSequence !== null) {
      builder.andWhere('message.sequence <= :maxSequence', {
        maxSequence: query.maxSequence,
      });
    }

    const page = await TypeOrmCursorPaginator.of(builder, query)
      .withSort('sequence', 'desc')
      .paginate();
    const senderMemberIds = [
      ...new Set(page.data.map((message) => message.senderMemberId)),
    ];
    const senderMembers = senderMemberIds.length
      ? await this.members.find({
          where: { id: In(senderMemberIds), isDeleted: false },
        })
      : [];
    const senderById = new Map(
      senderMembers.map((member) => [member.id, member]),
    );

    return {
      pagination: page.pagination,
      data: page.data.map((message) => {
        const sender = senderById.get(message.senderMemberId);
        return {
          id: message.id,
          conversationId: message.conversationId,
          senderUserId:
            sender?.participantType === ConversationParticipantType.USER
              ? sender.userId
              : null,
          senderName: message.senderNameSnapshot,
          senderType:
            sender?.participantType === ConversationParticipantType.SYSTEM
              ? 'system'
              : 'user',
          sequence: message.sequence,
          clientMessageId: message.clientMessageId,
          type: message.type,
          content: message.content,
          mediaId: message.mediaIds[0] ?? null,
          payload: message.payload,
          createdAt: message.createdAt,
        };
      }),
    };
  }
}
