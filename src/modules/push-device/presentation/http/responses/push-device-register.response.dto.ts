import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { PushPlatform } from '../../../domain/enums/push-platform.enum';

export class PushDeviceRegisterResponseDto {
  @ApiProperty({ format: 'uuid' }) id: Uuid;
  @ApiProperty({ enum: PushPlatform }) platform: PushPlatform;
}
