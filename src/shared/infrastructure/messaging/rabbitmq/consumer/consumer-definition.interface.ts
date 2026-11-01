/** Configuration needed to create one RabbitMQ consumer queue. */
export interface ConsumerDefinition {
  /** Handler name, used as `@RabbitSubscribe({ name })`. */
  name: string;
  /** Durable queue; also prefixes the `.retry` and `.dlq` queues. */
  queue: string;
  /** Routing keys bound on the events exchange. */
  routingKeys: readonly string[];
}
