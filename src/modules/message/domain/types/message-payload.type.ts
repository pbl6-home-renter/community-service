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

export type MessagePayload = MembersAddedMessagePayloadData;
