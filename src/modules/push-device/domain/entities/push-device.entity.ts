import { BaseEntity } from 'shared/domain/base/base.entity';
import { Uuid, generateUuid } from 'shared/domain/value-objects/uuid.vo';
import { PushPlatform } from '../enums/push-platform.enum';

export class PushDeviceEntity extends BaseEntity {
  private constructor(
    id: Uuid,
    readonly userId: Uuid,
    readonly token: string,
    readonly platform: PushPlatform,
    readonly lastSeenAt: Date,
    readonly revokedAt: Date | null,
    createdAt: Date,
    updatedAt: Date,
    isDeleted: boolean,
  ) {
    super(id, createdAt, updatedAt, isDeleted);
  }
  static reconstitute(props: {
    id?: Uuid;
    userId: Uuid;
    token: string;
    platform: PushPlatform;
    lastSeenAt: Date;
    revokedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
    isDeleted?: boolean;
  }): PushDeviceEntity {
    return new PushDeviceEntity(
      props.id ?? generateUuid(),
      props.userId,
      props.token,
      props.platform,
      props.lastSeenAt,
      props.revokedAt ?? null,
      props.createdAt ?? new Date(),
      props.updatedAt ?? new Date(),
      props.isDeleted ?? false,
    );
  }
}
