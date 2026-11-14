import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { CursorPaginatedResult } from 'shared/application/pagination/cursor-paginated-result';
import { TypeOrmCursorPaginator } from 'shared/infrastructure/database/pagination/typeorm-cursor.paginator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationMemberTypeormEntity } from 'modules/conversation-member/infrastructure/persistence/conversation-member.typeorm-entity';
import { ConversationParticipantType } from 'modules/conversation-member/domain/enums/conversation-participant-type.enum';
import { ConversationMemberStatus } from 'modules/conversation-member/domain/enums/conversation-member-status.enum';
import {
  containsLikePattern,
  foldVietnameseSql,
} from 'modules/conversation/infrastructure/queries/vietnamese-search.sql';
import {
  MessagePageQuery,
  MessagePageQueryPort,
  MessageReadModel,
  MessageSearchPageQuery,
  MessageSearchReadModel,
} from '../../application/ports/message-page-query.port';
import {
  CONTENT_MESSAGE_TYPES,
  ContentMessageType,
} from '../../domain/constants/content-message-types.constant';
import { MessageReplyReference } from '../../domain/value-objects/message-reply-reference.vo';
import { MessageMapper } from '../persistence/mappers/message.mapper';
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
    const builder = this.visibleMessages(
      query.conversationId,
      query.actorUserId,
    );

    if (query.maxSequence !== null) {
      builder.andWhere('message.sequence <= :maxSequence', {
        maxSequence: query.maxSequence,
      });
    }

    if (query.afterSequence !== null) {
      builder.andWhere('message.sequence > :afterSequence', {
        afterSequence: query.afterSequence,
      });
    }

    const page = await TypeOrmCursorPaginator.of(builder, query)
      .withSort('sequence', query.afterSequence !== null ? 'asc' : 'desc')
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
    const replyToById = await this.loadReplyReferences(page.data);

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
          replyTo: message.replyToMessageId
            ? (replyToById.get(message.replyToMessageId) ??
              MessageReplyReference.unavailable(message.replyToMessageId))
            : null,
          createdAt: message.createdAt,
        };
      }),
    };
  }

  async search(
    query: MessageSearchPageQuery,
  ): Promise<CursorPaginatedResult<MessageSearchReadModel>> {
    const builder = this.visibleMessages(
      query.conversationId,
      query.actorUserId,
    )
      .andWhere('message.type IN (:...contentTypes)', {
        contentTypes: [...CONTENT_MESSAGE_TYPES],
      })
      .andWhere('message.content IS NOT NULL')
      .andWhere(
        `${foldVietnameseSql('message.content')} LIKE ${foldVietnameseSql(':keywordPattern')}`,
        { keywordPattern: containsLikePattern(query.keyword) },
      );

    return TypeOrmCursorPaginator.of(builder, query)
      .withSort('sequence', 'desc')
      .paginate((raw) => {
        const message = MessageMapper.toDomain(raw);
        return {
          id: message.id,
          sequence: message.sequence,
          senderName: message.senderNameSnapshot,
          type: message.type as ContentMessageType,
          contentPreview: message.contentPreview,
          createdAt: message.createdAt,
        };
      });
  }

  /**
   * Live messages of the conversation the caller may see: active members see
   * all, read-only members up to their leftSequence.
   */
  private visibleMessages(
    conversationId: Uuid,
    actorUserId: Uuid,
  ): SelectQueryBuilder<MessageTypeormEntity> {
    return this.messages
      .createQueryBuilder('message')
      .where('message.conversationId = :conversationId', { conversationId })
      .andWhere('message.isDeleted = false')
      .andWhere(
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
          actorUserId,
          activeStatus: ConversationMemberStatus.ACTIVE,
          readOnlyStatus: ConversationMemberStatus.READ_ONLY,
        },
      );
  }

  /** Originals are loaded including deleted rows so they render as unavailable. */
  private async loadReplyReferences(
    messages: MessageTypeormEntity[],
  ): Promise<Map<Uuid, MessageReplyReference>> {
    const ids = [
      ...new Set(
        messages
          .map((message) => message.replyToMessageId)
          .filter((id): id is Uuid => id !== null),
      ),
    ];
    if (ids.length === 0) return new Map();
    const originals = await this.messages.find({ where: { id: In(ids) } });
    return new Map(
      originals.map((raw) => [
        raw.id,
        MessageReplyReference.of(MessageMapper.toDomain(raw)),
      ]),
    );
  }
}
