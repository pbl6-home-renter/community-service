import { ConfigService } from '@nestjs/config';

export function getConfigValue(
  configService: ConfigService,
  key: string,
  defaultValue?: string,
): string {
  const value = configService.get<string>(key);

  if (value === undefined || value === null || value === '') {
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new Error(`Environment variable "${key}" is required but not set`);
  }

  return value;
}

export function getConfigNumber(
  configService: ConfigService,
  key: string,
  defaultValue?: number,
): number {
  const value = getConfigValue(configService, key, defaultValue?.toString());
  const parsed = Number(value);

  if (isNaN(parsed)) {
    throw new Error(`Environment variable "${key}" is not a valid number`);
  }

  return parsed;
}

export function getConfigBoolean(
  configService: ConfigService,
  key: string,
  defaultValue?: boolean,
): boolean {
  const value = getConfigValue(configService, key, defaultValue?.toString());

  try {
    return Boolean(JSON.parse(value));
  } catch {
    return value === 'true';
  }
}

export function getConfigString(
  configService: ConfigService,
  key: string,
  defaultValue?: string,
): string {
  return getConfigValue(configService, key, defaultValue).replaceAll(
    '\\n',
    '\n',
  );
}
