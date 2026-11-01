import { ConsumerDefinition } from './consumer-definition.interface';

/**
 * Feature modules declare their consumer queues here instead of editing the shared
 * RabbitMQ config. Registration runs when a subscriber file is imported, before
 * Nest builds the RabbitMQ config, so this registry intentionally uses static state.
 */
export class ConsumerRegistry {
  private static readonly definitions = new Map<string, ConsumerDefinition>();

  /** Registers a consumer and returns its handler name for `@RabbitSubscribe`. */
  static define(definition: ConsumerDefinition): string {
    if (this.definitions.has(definition.name)) {
      throw new Error(
        `RabbitMQ consumer "${definition.name}" is defined twice`,
      );
    }

    this.definitions.set(definition.name, definition);
    return definition.name;
  }

  static getAll(): ConsumerDefinition[] {
    return [...this.definitions.values()];
  }
}
