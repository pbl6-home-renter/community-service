import { Logger } from '@nestjs/common';
import type { MessageErrorHandler } from '@golevelup/nestjs-rabbitmq';
import type { ConsumeMessage } from 'amqplib';
import { XDeathEntry } from './x-death-entry.interface';

/**
 * Retries failed messages through `<queue>.retry` and moves them to
 * `<queue>.dlq` after the configured attempt limit.
 */
export class ConsumerErrorHandler {
  private readonly logger = new Logger(ConsumerErrorHandler.name);

  create(queue: string, maxAttempts: number): MessageErrorHandler {
    return (channel, message, error: unknown) => {
      const attempt = this.previousFailures(message, queue) + 1;
      const reason = error instanceof Error ? error.message : String(error);

      if (attempt < maxAttempts) {
        this.logger.warn(
          `${queue}: attempt ${attempt}/${maxAttempts} failed, retrying: ${reason}`,
        );
        // Dead-letters to <queue>.retry via the queue's x-dead-letter-* arguments.
        channel.nack(message, false, false);
        return;
      }

      this.logger.error(
        `${queue}: giving up after ${attempt} attempts, moving to DLQ: ${reason}`,
      );
      channel.sendToQueue(`${queue}.dlq`, message.content, {
        ...message.properties,
        headers: {
          ...message.properties.headers,
          'x-last-error': reason.slice(0, 1000),
        },
      });
      channel.ack(message);
    };
  }

  /** How many times `queue` already rejected this message (from the x-death header). */
  private previousFailures(message: ConsumeMessage, queue: string): number {
    const deaths = (message.properties.headers?.['x-death'] ??
      []) as XDeathEntry[];
    const entry = deaths.find(
      (death) => death.queue === queue && death.reason === 'rejected',
    );
    return entry ? Number(entry.count) : 0;
  }
}
