import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { EmailDeliveryStatus } from '../enums/email-delivery-status.enum';

export interface EmailDeliveryProps {
  id: Uuid;
  recipientEmail: string;
  subject: string;
  status: EmailDeliveryStatus;
  failureReason?: string;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}
