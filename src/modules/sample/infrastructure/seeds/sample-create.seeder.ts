import type { DataSource } from 'typeorm';
import type { Seeder } from 'typeorm-extension';

import { Uuid } from 'shared/domain/value-objects/uuid.vo';

import { SampleTypeormEntity } from '../persistence/sample.typeorm-entity';

export class SampleCreateSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    await dataSource
      .createQueryBuilder()
      .insert()
      .into(SampleTypeormEntity)
      .values({
        id: '00000000-0000-4000-8000-000000000101' as Uuid,
        title: 'Seed sample',
        description: 'Generic sample fixture for the boilerplate.',
        isDeleted: false,
      })
      .orIgnore()
      .execute();
  }
}
