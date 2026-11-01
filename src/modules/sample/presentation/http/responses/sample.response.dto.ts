import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SampleEntity } from '../../../domain/entities/sample.entity';

export class SampleResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Sample Title' })
  title: string;

  @ApiPropertyOptional({ example: 'Detailed description of the sample' })
  description?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromDomain(entity: SampleEntity): SampleResponseDto {
    const dto = new SampleResponseDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.description = entity.description;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
