export interface RabbitMqConfig {
  url: string;
  exchange: string;
  exchangeType: string;
  prefetch: number;
  connectTimeoutMs: number;
  /**
   * Publish with `mandatory`, so a message no queue is bound to comes back as a failure.
   * Disable only while the consumers of the published routing keys do not exist yet.
   */
  publishMandatory: boolean;
  /** Total deliveries (first included) before a consumer moves a message to its DLQ. */
  consumerMaxAttempts: number;
  /** Delay a failed message spends in `<queue>.retry` before it is redelivered. */
  consumerRetryDelayMs: number;
}
