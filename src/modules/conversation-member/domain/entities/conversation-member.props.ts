import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationMemberRole } from '../enums/conversation-member-role.enum';
import { ConversationMemberStatus } from '../enums/conversation-member-status.enum';
import { ConversationParticipantType } from '../enums/conversation-participant-type.enum';

interface ConversationMemberBaseProps {
  id?: Uuid;
  conversationId: Uuid;
  displayName: string;
  status?: ConversationMemberStatus;
  joinedAt?: Date;
  leftAt?: Date | null;
  leftSequence?: string | null;
  lastReadSequence?: string;
  createdAt?: Date;
  updatedAt?: Date;
  isDeleted?: boolean;
}

export type ConversationMemberParticipantProps =
  | {
      participantType: ConversationParticipantType.USER;
      userId: Uuid;
      systemParticipantKey?: null;
      role: ConversationMemberRole.ADMIN | ConversationMemberRole.MEMBER;
    }
  | {
      participantType: ConversationParticipantType.SYSTEM;
      userId?: null;
      systemParticipantKey: string;
      role: ConversationMemberRole.SYSTEM;
    };

export type ConversationMemberProps = ConversationMemberBaseProps &
  ConversationMemberParticipantProps;

export type ConversationMemberIdentity =
  | { participantType: ConversationParticipantType.USER; userId: Uuid }
  | {
      participantType: ConversationParticipantType.SYSTEM;
      systemParticipantKey: string;
    };
