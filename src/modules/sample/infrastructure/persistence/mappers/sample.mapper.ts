import { SampleEntity } from '../../../domain/entities/sample.entity';
import { SampleTypeormEntity } from '../sample.typeorm-entity';

export class SampleMapper {
  static toDomain(raw: SampleTypeormEntity): SampleEntity {
    return SampleEntity.reconstitute({
      id: raw.id,
      title: raw.title,
      description: raw.description,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      isDeleted: raw.isDeleted,
    });
  }

  static toPersistence(entity: SampleEntity): SampleTypeormEntity {
    const raw = new SampleTypeormEntity();
    raw.id = entity.id;
    raw.title = entity.title;
    raw.description = entity.description;
    raw.createdAt = entity.createdAt;
    raw.updatedAt = entity.updatedAt;
    raw.isDeleted = entity.isDeleted;
    return raw;
  }
}
