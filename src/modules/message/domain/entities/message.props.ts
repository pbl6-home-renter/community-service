import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MessageType } from '../enums/message-type.enum';

export interface MessageProps {
  id?: Uuid;
  conversationId: Uuid;
  senderMemberId: Uuid;
  clientMessageId?: Uuid | null;
  type: MessageType;
  content?: string | null;
  mediaId?: Uuid | null;
  payload?: Record<string, unknown> | null;
  sequence: string;
  createdAt?: Date;
  updatedAt?: Date;
  isDeleted?: boolean;
}
