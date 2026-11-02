import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MessageType } from '../enums/message-type.enum';
import { MessagePayload } from '../types/message-payload.type';

export interface MessageProps {
  id?: Uuid;
  conversationId: Uuid;
  senderMemberId: Uuid;
  senderNameSnapshot: string;
  clientMessageId?: Uuid | null;
  type: MessageType;
  content?: string | null;
  mediaId?: Uuid | null;
  payload?: MessagePayload | null;
  sequence: string;
  createdAt?: Date;
  updatedAt?: Date;
  isDeleted?: boolean;
}
