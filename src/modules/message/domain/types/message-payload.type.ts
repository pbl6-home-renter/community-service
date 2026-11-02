import { Uuid } from 'shared/domain/value-objects/uuid.vo';

/** Payload của system message khi admin thêm thành viên vào hội thoại. */
export interface MembersAddedMessagePayloadData {
  action: 'members_added';
  actorUserId: Uuid;
  members: Array<{
    userId: Uuid;
    displayName: string;
  }>;
}

export interface ConversationMemberSnapshot {
  userId: Uuid;
  displayName: string;
}

export interface MemberKickedMessagePayloadData {
  action: 'member_kicked';
  actorUserId: Uuid;
  member: ConversationMemberSnapshot;
}

export interface MemberLeftMessagePayloadData {
  action: 'member_left';
  actorUserId: Uuid;
  member: ConversationMemberSnapshot;
}

export interface AdminTransferredMessagePayloadData {
  action: 'admin_transferred';
  actorUserId: Uuid;
  member: ConversationMemberSnapshot;
}

export type MessagePayload =
  | MembersAddedMessagePayloadData
  | MemberKickedMessagePayloadData
  | MemberLeftMessagePayloadData
  | AdminTransferredMessagePayloadData;
