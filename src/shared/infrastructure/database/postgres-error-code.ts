export const PostgresErrorCode = {
  UNIQUE_VIOLATION: '23505',
  NOT_NULL_VIOLATION: '23502',
  FOREIGN_KEY_VIOLATION: '23503',
} as const;

export type PostgresErrorCodeType =
  (typeof PostgresErrorCode)[keyof typeof PostgresErrorCode];
