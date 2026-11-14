import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { TypeOrmPaginator } from 'shared/infrastructure/database/pagination/typeorm.paginator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationMemberStatus } from 'modules/conversation-member/domain/enums/conversation-member-status.enum';
import { ConversationParticipantType } from 'modules/conversation-member/domain/enums/conversation-participant-type.enum';
import { ConversationMemberTypeormEntity } from 'modules/conversation-member/infrastructure/persistence/conversation-member.typeorm-entity';
import { UNREAD_COUNTED_MESSAGE_TYPES } from 'modules/message/domain/constants/unread-counted-message-types.constant';
import { MessageType } from 'modules/message/domain/enums/message-type.enum';
import { MessagePayload } from 'modules/message/domain/types/message-payload.type';
import {
  ConversationListReadModel,
  ConversationPageQuery,
  ConversationPageQueryPort,
} from '../../application/ports/conversation-page-query.port';
import { ConversationKind } from '../../domain/enums/conversation-kind.enum';
import { ConversationMapper } from '../persistence/mappers/conversation.mapper';
import { ConversationTypeormEntity } from '../persistence/conversation.typeorm-entity';
import {
  containsLikePattern,
  foldVietnameseSql,
} from './vietnamese-search.sql';

interface ConversationActivityRow {
  conversationId: Uuid;
  otherMemberDisplayName: string | null;
  otherMemberUserId: Uuid | null;
  unreadCount: string;
  lastMessageId: Uuid | null;
  lastMessageSequence: string | null;
  senderNameSnapshot: string | null;
  lastMessageContent: string | null;
  lastMessageType: MessageType | null;
  lastMessagePayload: MessagePayload | null;
  lastMessageSentAt: Date | null;
}

@Injectable()
export class TypeOrmConversationPageQuery implements ConversationPageQueryPort {
  constructor(
    @InjectRepository(ConversationTypeormEntity)
    private readonly conversations: Repository<ConversationTypeormEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findPage(
    query: ConversationPageQuery,
  ): Promise<PaginatedResult<ConversationListReadModel>> {
    const queryBuilder = this.conversations
      .createQueryBuilder('conversation')
      .innerJoin(
        ConversationMemberTypeormEntity,
        'currentMember',
        'currentMember.conversationId = conversation.id',
      )
      .where('conversation.isDeleted = false')
      .andWhere('currentMember.isDeleted = false')
      .andWhere('currentMember.participantType = :participantType', {
        participantType: ConversationParticipantType.USER,
      })
      .andWhere('currentMember.userId = :userId', { userId: query.userId })
      .andWhere('currentMember.status IN (:...readableStatuses)', {
        readableStatuses: [
          ConversationMemberStatus.ACTIVE,
          ConversationMemberStatus.READ_ONLY,
        ],
      });

    // A direct conversation is shown only once the viewer can read a message.
    queryBuilder.andWhere(
      `(conversation.kind <> :directKind OR EXISTS (
         SELECT 1 FROM messages AS visible_message
         WHERE visible_message.conversation_id = "conversation"."id"
           AND visible_message.is_deleted = false
           AND (
             "currentMember"."status" = :activeStatus
             OR visible_message.sequence <= "currentMember"."left_sequence"
           )
       ))`,
      {
        directKind: ConversationKind.DIRECT,
        activeStatus: ConversationMemberStatus.ACTIVE,
      },
    );

    if (query.kind !== null) {
      queryBuilder.andWhere('conversation.kind = :kind', { kind: query.kind });
    }

    if (query.hasContext === true) {
      queryBuilder.andWhere('conversation.contextType IS NOT NULL');
    } else if (query.hasContext === false) {
      queryBuilder.andWhere('conversation.contextType IS NULL');
    }

    if (query.otherUserId !== null) {
      queryBuilder.andWhere('conversation.directPairKey = :directPairKey', {
        directPairKey: [query.userId, query.otherUserId]
          .map((userId) => userId.toLowerCase())
          .sort()
          .join(':'),
      });
    }

    if (query.searchKeyword !== null) {
      queryBuilder.andWhere(
        `(
          (conversation.kind = :groupKind
            AND ${foldVietnameseSql('conversation.title')} LIKE ${foldVietnameseSql(':namePattern')})
          OR (conversation.kind = :directKind AND EXISTS (
            SELECT 1 FROM conversation_members AS search_member
            WHERE search_member.conversation_id = "conversation"."id"
              AND search_member.participant_type = :userParticipantType
              AND search_member.is_deleted = false
              AND search_member.id <> "currentMember"."id"
              AND ${foldVietnameseSql('search_member.display_name')} LIKE ${foldVietnameseSql(':namePattern')}
          ))
        )`,
        {
          groupKind: ConversationKind.GROUP,
          directKind: ConversationKind.DIRECT,
          userParticipantType: ConversationParticipantType.USER,
          namePattern: containsLikePattern(query.searchKeyword),
        },
      );
    }

    if (query.contextType !== null && query.contextId !== null) {
      queryBuilder
        .andWhere('conversation.contextType = :contextType', {
          contextType: query.contextType,
        })
        .andWhere('conversation.contextId = :contextId', {
          contextId: query.contextId,
        });
    }

    // Written as raw SQL with quoted outer aliases: TypeORM does not resolve
    // `currentMember.*` / `conversation.*` property paths inside select
    // expressions, and Postgres would fold the unquoted camelCase alias.
    const latestActivity = `COALESCE((
      SELECT MAX(last_activity_message.created_at)
      FROM messages AS last_activity_message
      WHERE last_activity_message.conversation_id = "conversation"."id"
        AND last_activity_message.is_deleted = false
        AND (
          "currentMember"."status" = :activeStatus
          OR last_activity_message.sequence <= "currentMember"."left_sequence"
        )
    ), "conversation"."created_at")`;
    const activityOrderAlias = 'latest_activity_at';
    queryBuilder
      .addSelect(latestActivity, activityOrderAlias)
      .setParameter('activeStatus', ConversationMemberStatus.ACTIVE)
      .orderBy(activityOrderAlias, 'DESC')
      .addOrderBy('conversation.id', 'DESC');

    const page = await TypeOrmPaginator.offset(queryBuilder, query).paginate(
      ConversationMapper.toDomain,
    );
    if (page.data.length === 0) {
      return { data: [], pagination: page.pagination };
    }

    const conversationIds = page.data.map((conversation) => conversation.id);
    const activityRows = (await this.dataSource.query(
      `SELECT
         current_member.conversation_id AS "conversationId",
         other_member.display_name AS "otherMemberDisplayName",
         other_member.user_id AS "otherMemberUserId",
         COALESCE(unread_messages.unread_count, 0)::text AS "unreadCount",
         latest_message.id AS "lastMessageId",
         latest_message.sequence AS "lastMessageSequence",
         latest_message.sender_name_snapshot AS "senderNameSnapshot",
         latest_message.content AS "lastMessageContent",
         latest_message.message_type AS "lastMessageType",
         latest_message.payload AS "lastMessagePayload",
         latest_message.created_at AS "lastMessageSentAt"
       FROM conversation_members AS current_member
       LEFT JOIN LATERAL (
         SELECT peer_member.display_name, peer_member.user_id
         FROM conversation_members AS peer_member
         WHERE peer_member.conversation_id = current_member.conversation_id
           AND peer_member.participant_type = 'user'
           AND peer_member.is_deleted = false
           AND peer_member.id <> current_member.id
         ORDER BY peer_member.joined_at ASC, peer_member.id ASC
         LIMIT 1
       ) AS other_member ON true
       LEFT JOIN LATERAL (
         SELECT message.id, message.sequence, message.sender_name_snapshot,
                message.content, message.message_type, message.payload, message.created_at
         FROM messages AS message
         WHERE message.conversation_id = current_member.conversation_id
           AND message.is_deleted = false
           AND (
             current_member.status = 'active'
             OR message.sequence <= current_member.left_sequence
           )
         ORDER BY message.sequence DESC
         LIMIT 1
       ) AS latest_message ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS unread_count
         FROM messages AS message
         WHERE message.conversation_id = current_member.conversation_id
           AND message.is_deleted = false
           AND message.sequence > current_member.last_read_sequence
           AND (
             current_member.status = 'active'
             OR message.sequence <= current_member.left_sequence
           )
           AND message.sender_member_id <> current_member.id
           AND message.message_type = ANY($3::text[])
       ) AS unread_messages ON true
       WHERE current_member.user_id = $1
         AND current_member.participant_type = 'user'
         AND current_member.is_deleted = false
         AND current_member.conversation_id = ANY($2::uuid[])`,
      [query.userId, conversationIds, UNREAD_COUNTED_MESSAGE_TYPES],
    )) as ConversationActivityRow[];
    const activityByConversationId = new Map(
      activityRows.map((row) => [row.conversationId.toLowerCase(), row]),
    );

    return {
      data: page.data.map((conversation) => {
        const activity = activityByConversationId.get(
          conversation.id.toLowerCase(),
        );
        return {
          id: conversation.id,
          kind: conversation.kind,
          contextType: conversation.contextType,
          contextId: conversation.contextId,
          title: conversation.title?.value ?? null,
          displayName:
            conversation.kind === ConversationKind.DIRECT
              ? (activity?.otherMemberDisplayName ?? null)
              : (conversation.title?.value ?? null),
          otherUserId:
            conversation.kind === ConversationKind.DIRECT
              ? (activity?.otherMemberUserId ?? null)
              : null,
          avatarMediaId: conversation.avatarMediaId,
          unreadCount: Number(activity?.unreadCount ?? 0),
          lastMessage: activity?.lastMessageId
            ? {
                id: activity.lastMessageId,
                sequence: activity.lastMessageSequence!,
                senderNameSnapshot: activity.senderNameSnapshot!,
                content:
                  activity.lastMessageType === MessageType.IMAGE
                    ? 'Đã gửi ảnh'
                    : activity.lastMessageContent,
                type: activity.lastMessageType!,
                payload: activity.lastMessagePayload,
                sentAt: activity.lastMessageSentAt!,
              }
            : null,
        };
      }),
      pagination: page.pagination,
    };
  }
}
