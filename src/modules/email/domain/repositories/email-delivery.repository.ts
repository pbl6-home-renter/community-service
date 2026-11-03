import { EmailDelivery } from '../entities/email-delivery.entity';

export interface EmailDeliveryRepository {
  recordIfNew(delivery: EmailDelivery): Promise<boolean>;
  save(delivery: EmailDelivery): Promise<void>;
  deleteCreatedBefore(before: Date): Promise<number>;
}
