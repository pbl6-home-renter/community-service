import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { PushDeviceEntity } from '../../domain/entities/push-device.entity';
import { PushPlatform } from '../../domain/enums/push-platform.enum';
import { PushDeviceRepository } from '../../domain/repositories/push-device.repository';
import { PushDeviceTypeormEntity } from './push-device.typeorm-entity';

@Injectable()
export class TypeOrmPushDeviceRepository implements PushDeviceRepository {
  constructor(
    @InjectRepository(PushDeviceTypeormEntity)
    private readonly repository: Repository<PushDeviceTypeormEntity>,
  ) {}
  async register(
    userId: Uuid,
    token: string,
    at: Date,
    context: TransactionContext,
  ): Promise<PushDeviceEntity> {
    const repository = withTransaction(this.repository, context);
    await repository.upsert(
      {
        userId,
        token,
        platform: PushPlatform.ANDROID,
        lastSeenAt: at,
        revokedAt: null,
        updatedAt: at,
        isDeleted: false,
      },
      { conflictPaths: ['token'], skipUpdateIfNoValuesChanged: false },
    );
    const record = await repository.findOneByOrFail({ token });
    return PushDeviceEntity.reconstitute({
      id: record.id,
      userId: record.userId,
      token: record.token,
      platform: record.platform,
      lastSeenAt: record.lastSeenAt,
      revokedAt: record.revokedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      isDeleted: record.isDeleted,
    });
  }
  async revoke(
    userId: Uuid,
    deviceId: Uuid,
    at: Date,
    context: TransactionContext,
  ): Promise<boolean> {
    const result = await withTransaction(this.repository, context).update(
      { id: deviceId, userId, revokedAt: IsNull(), isDeleted: false },
      { revokedAt: at, updatedAt: at },
    );
    return (result.affected ?? 0) > 0;
  }
}
