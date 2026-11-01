export interface OutboxConfig {
  relayEnabled: boolean;
  relayIntervalMs: number;
  relayBatchSize: number;
  publishTimeoutMs: number;
  claimTimeoutMs: number;
  /** Total publish attempts (first try included) before a message becomes FAILED. */
  maxAttempts: number;
  retryBaseDelayMs: number;
  retryMaxDelayMs: number;
  retentionMs: number;
}
