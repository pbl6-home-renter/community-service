import { ServiceConstants } from 'config/service.constants';

export type EnvReader = (key: string) => string | undefined;

type SslConfig = false | { rejectUnauthorized: boolean };

export type DatabaseConfig = (
  | { url: string }
  | {
      host: string;
      port: number;
      username: string;
      password: string;
      database: string;
    }
) & {
  ssl: SslConfig;
  logging: boolean;
};

export interface ResolveDatabaseConfigOptions {
  preferMigrationUrl?: boolean;
}

export function resolveDatabaseConfig(
  readEnv: EnvReader,
  options: ResolveDatabaseConfigOptions = {},
): DatabaseConfig {
  const read = (key: string): string | undefined => {
    const value = readEnv(key)?.trim();
    return value ? value : undefined;
  };

  const url =
    (options.preferMigrationUrl ? read('MIGRATION_DATABASE_URL') : undefined) ??
    read('DATABASE_URL');
  const ssl: SslConfig = resolveSsl(read, url)
    ? { rejectUnauthorized: false }
    : false;
  const logging = parseBoolean(read('ENABLE_ORM_LOGS'));

  if (url) {
    return { url, ssl, logging };
  }

  return {
    host: read('DB_HOST') ?? 'localhost',
    port: parsePort(read('DB_PORT')),
    username: read('DB_USERNAME') ?? 'postgres',
    password: read('DB_PASSWORD') ?? 'postgres',
    database: read('DB_DATABASE') ?? ServiceConstants.DEFAULT_DATABASE_NAME,
    ssl,
    logging,
  };
}

function resolveSsl(read: EnvReader, url: string | undefined): boolean {
  const explicitSsl = read('DB_SSL');
  if (explicitSsl !== undefined) {
    return explicitSsl.toLowerCase() === 'true';
  }

  if (isSupabaseHost(hostnameOf(url) ?? read('DB_HOST'))) {
    return true;
  }

  const nodeEnv = read('NODE_ENV') ?? 'dev';
  return nodeEnv === 'prod' || nodeEnv === 'production';
}

function hostnameOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    // The PostgreSQL driver reports a malformed URL when connecting.
    return undefined;
  }
}

function isSupabaseHost(hostname: string | undefined): boolean {
  return (
    !!hostname &&
    (hostname.endsWith('.supabase.co') ||
      hostname.endsWith('.pooler.supabase.com'))
  );
}

function parsePort(value: string | undefined): number {
  if (value === undefined) return 5432;
  const port = Number(value);
  if (!Number.isInteger(port)) {
    throw new Error('Environment variable "DB_PORT" is not a valid number');
  }
  return port;
}

function parseBoolean(value: string | undefined): boolean {
  if (value === undefined) return false;
  try {
    return Boolean(JSON.parse(value));
  } catch {
    return value === 'true';
  }
}
