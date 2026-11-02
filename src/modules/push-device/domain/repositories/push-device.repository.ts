import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { PushDeviceEntity } from '../entities/push-device.entity';

export interface PushDeviceRepository {
  register(
    userId: Uuid,
    token: string,
    at: Date,
    context: TransactionContext,
  ): Promise<PushDeviceEntity>;
  revoke(
    userId: Uuid,
    deviceId: Uuid,
    at: Date,
    context: TransactionContext,
  ): Promise<boolean>;
}
