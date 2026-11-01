import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import type { DataSourceOptions } from 'typeorm';
import type { SeederOptions } from 'typeorm-extension';
import { resolveDatabaseConfig } from '../config/database.config';
import { typeOrmBaseOptions } from './typeorm-base-options';

/**
 * The CLI (migrations, seeds) runs outside Nest, so it reads `.env` itself.
 * Precedence: real environment > `./.env` > `../.env` (a shared env one level up).
 */
const envFilePaths = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '..', '.env'),
];

for (const envFilePath of envFilePaths) {
  if (!existsSync(envFilePath)) {
    continue;
  }

  const values = parseEnv(readFileSync(envFilePath, 'utf8'));
  for (const [key, value] of Object.entries(values)) {
    process.env[key] ??= value;
  }
}

export function createDataSourceOptions(): DataSourceOptions & SeederOptions {
  return {
    ...typeOrmBaseOptions,
    ...resolveDatabaseConfig((key) => process.env[key], {
      preferMigrationUrl: true,
    }),
    seeds: [
      resolve(
        __dirname,
        '../../../modules/*/infrastructure/seeds/**/*.seeder{.ts,.js}',
      ),
    ],
  };
}
