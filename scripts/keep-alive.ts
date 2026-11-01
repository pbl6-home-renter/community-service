import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { performance } from 'node:perf_hooks';

const envFilePath = resolve(process.cwd(), '.env');

if (existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath);
}

const DRY_RUN = process.argv.includes('--dry-run');

const RETRY_DELAYS = [1000, 4000, 16000];

function getDatabaseConfig():
  | {
      connectionString: string;
    }
  | {
      host: string;
      port: number;
      user: string;
      password: string;
      database: string;
    } {
  const databaseUrl =
    process.env.KEEPALIVE_DATABASE_URL?.trim() ||
    process.env.MIGRATION_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim();

  if (databaseUrl) {
    return { connectionString: databaseUrl };
  }

  const portValue = process.env.DB_PORT?.trim();
  const port = portValue ? Number.parseInt(portValue, 10) : 5432;

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be a valid port number');
  }

  return {
    host: process.env.DB_HOST?.trim() || 'localhost',
    port,
    user: process.env.DB_USERNAME?.trim() || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE?.trim() || 'app_db',
  };
}

function shouldUseSsl(connectionTarget: string): boolean {
  const explicitSsl = process.env.DB_SSL;

  if (explicitSsl !== undefined && explicitSsl.trim() !== '') {
    return explicitSsl.trim().toLowerCase() === 'true';
  }

  let hostname = connectionTarget;

  try {
    hostname = new URL(connectionTarget).hostname;
  } catch {
    // A plain DB_HOST is not a URL.
  }

  return (
    hostname.endsWith('.supabase.co') ||
    hostname.endsWith('.pooler.supabase.com')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function executeKeepalive(): Promise<void> {
  const databaseConfig = getDatabaseConfig();
  const connectionTarget =
    'connectionString' in databaseConfig
      ? databaseConfig.connectionString
      : databaseConfig.host;

  const client = new Client({
    ...databaseConfig,
    ssl: shouldUseSsl(connectionTarget) ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10_000,
  });

  const startedAt = performance.now();

  try {
    await client.connect();

    if (DRY_RUN) {
      const result = await client.query<{
        database_time: Date;
      }>('SELECT now() AS database_time');

      const latency = Math.round(performance.now() - startedAt);

      console.log(`[keepalive] Connection OK (${latency} ms)`);

      console.log(`[keepalive] Database time: ${result.rows[0].database_time}`);

      return;
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS ops_keepalive (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pinged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        app_version VARCHAR(50) DEFAULT '1.0.0',
        note VARCHAR(255) DEFAULT 'Keepalive health check'
      )
    `);

    const inserted = await client.query<{
      id: string;
    }>(
      `
        INSERT INTO ops_keepalive (
          app_version,
          note
        )
        VALUES ($1, $2)
        RETURNING id
      `,
      [process.env.APP_VERSION ?? '1.0.0', 'Keepalive health check'],
    );

    const id = inserted.rows[0].id;

    const readBack = await client.query(
      `
        SELECT
          id,
          pinged_at,
          app_version,
          note
        FROM ops_keepalive
        WHERE id = $1
      `,
      [id],
    );

    if (readBack.rowCount !== 1) {
      throw new Error('Keepalive row could not be read back');
    }

    await client.query(`
      DELETE FROM ops_keepalive
      WHERE id NOT IN (
        SELECT id
        FROM ops_keepalive
        ORDER BY pinged_at DESC, id DESC
        LIMIT 100
      )
    `);

    const countResult = await client.query<{
      count: string;
    }>(
      `
        SELECT COUNT(*)::text AS count
        FROM ops_keepalive
      `,
    );

    const latency = Math.round(performance.now() - startedAt);

    console.log(`[keepalive] Success (${latency} ms)`);

    console.log(`[keepalive] Inserted row: ${id}`);

    console.log(`[keepalive] Retained rows: ${countResult.rows[0].count}`);
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function main(): Promise<void> {
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt += 1) {
    try {
      await executeKeepalive();
      return;
    } catch (error) {
      if (attempt === RETRY_DELAYS.length) {
        console.error('[keepalive] Failed after all retries', error);

        process.exitCode = 1;
        return;
      }

      const delay = RETRY_DELAYS[attempt];

      console.warn(`[keepalive] Attempt ${attempt + 1} failed.`);

      console.warn(`[keepalive] Retrying in ${delay} ms...`);

      await sleep(delay);
    }
  }
}

void main();
