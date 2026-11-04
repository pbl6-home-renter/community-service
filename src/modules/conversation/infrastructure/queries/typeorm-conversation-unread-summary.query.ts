import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { UNREAD_COUNTED_MESSAGE_TYPES } from 'modules/message/domain/constants/unread-counted-message-types.constant';
import { ConversationUnreadSummaryQueryPort } from '../../application/ports/conversation-unread-summary-query.port';

interface TotalUnreadRow {
  totalUnreadCount: string;
}

/**
 * Same unread rule as the conversation list/detail and mark-read: counted
 * types only, messages from other members, after the read cursor, and up to
 * leftSequence for read-only members.
 */
@Injectable()
export class TypeOrmConversationUnreadSummaryQuery implements ConversationUnreadSummaryQueryPort {
  constructor(private readonly dataSource: DataSource) {}

  async countTotalUnread(userId: Uuid): Promise<number> {
    const rows = (await this.dataSource.query(
      `SELECT COALESCE(SUM(unread_messages.unread_count), 0)::text AS "totalUnreadCount"
       FROM conversation_members AS current_member
       INNER JOIN conversations AS conversation
         ON conversation.id = current_member.conversation_id
        AND conversation.is_deleted = false
       CROSS JOIN LATERAL (
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
           AND message.message_type = ANY($2::text[])
       ) AS unread_messages
       WHERE current_member.user_id = $1
         AND current_member.participant_type = 'user'
         AND current_member.is_deleted = false
         AND current_member.status IN ('active', 'read_only')`,
      [userId, UNREAD_COUNTED_MESSAGE_TYPES],
    )) as TotalUnreadRow[];
    return Number(rows[0]?.totalUnreadCount ?? 0);
  }
}
