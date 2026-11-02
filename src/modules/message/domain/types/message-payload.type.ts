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

export type ConversationMemberRoleValue = 'admin' | 'member';

export interface MemberRoleChangedMessagePayloadData {
  action: 'member_role_changed';
  actorUserId: Uuid;
  member: ConversationMemberSnapshot;
  oldRole: ConversationMemberRoleValue;
  newRole: ConversationMemberRoleValue;
}

export interface ConversationTitleChangedMessagePayloadData {
  action: 'conversation_title_changed';
  actorUserId: Uuid;
  oldTitle: string | null;
  newTitle: string | null;
}

export interface ConversationAvatarChangedMessagePayloadData {
  action: 'conversation_avatar_changed';
  actorUserId: Uuid;
  oldAvatarMediaId: Uuid | null;
  newAvatarMediaId: Uuid | null;
}

export type MessagePayload =
  | MembersAddedMessagePayloadData
  | MemberKickedMessagePayloadData
  | MemberLeftMessagePayloadData
  | AdminTransferredMessagePayloadData
  | MemberRoleChangedMessagePayloadData
  | ConversationTitleChangedMessagePayloadData
  | ConversationAvatarChangedMessagePayloadData;
