import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import type { DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from './snake-naming.strategy';

type PostgresOptions = Extract<DataSourceOptions, { type: 'postgres' }>;

const SRC_ROOT = __dirname + '/../../..';

/** Matches `@Entity(` in TypeScript and its compiled form in `dist/`. */
const ENTITY_DECORATOR = /@Entity\(|\.Entity\)\(/;
const ENTITY_FILE =
  /\/infrastructure\/persistence\/[^/]+\.typeorm-entity\.(ts|js)$/;

/**
 * TypeORM loads entities by file name, so a misnamed entity would be skipped
 * silently and only fail at query time ("No metadata for X"). Every entity
 * must live at `modules/<context>/infrastructure/persistence/*.typeorm-entity.ts`.
 */
function entityGlobs(): string[] {
  const modulesDir = join(SRC_ROOT, 'modules');
  const misplaced = readdirSync(modulesDir, {
    recursive: true,
    encoding: 'utf8',
  })
    .map((path) => '/' + path.split(sep).join('/'))
    .filter((path) => /\.(ts|js)$/.test(path) && !path.endsWith('.d.ts'))
    .filter((path) =>
      ENTITY_DECORATOR.test(readFileSync(join(modulesDir, path), 'utf8')),
    )
    .filter((path) => !ENTITY_FILE.test(path));

  if (misplaced.length > 0) {
    throw new Error(
      'TypeORM entities must be named modules/<context>/infrastructure/persistence/*.typeorm-entity.ts: ' +
        misplaced.map((path) => `modules${path}`).join(', '),
    );
  }

  return [
    SRC_ROOT +
      '/modules/*/infrastructure/persistence/*.typeorm-entity{.ts,.js}',
  ];
}

export const typeOrmBaseOptions: Pick<
  PostgresOptions,
  'type' | 'dropSchema' | 'namingStrategy' | 'entities' | 'migrations'
> = {
  type: 'postgres',
  dropSchema: false,
  namingStrategy: new SnakeNamingStrategy(),
  entities: entityGlobs(),
  migrations: [SRC_ROOT + '/database/migrations/**/*{.ts,.js}'],
};
