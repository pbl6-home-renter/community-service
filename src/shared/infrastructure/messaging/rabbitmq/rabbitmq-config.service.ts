import { Injectable } from '@nestjs/common';
import { RabbitMQConfig, RabbitMQHandlers } from '@golevelup/nestjs-rabbitmq';
import { ApiConfigService } from '../../config/api-config.service';
import { ConsumerErrorHandler } from './consumer/consumer-error-handler';
import { ConsumerRegistry } from './consumer/consumer-registry';

const ORDERED_CHANNEL = 'ordered-consumers';

@Injectable()
export class RabbitMqConfigService {
  private readonly consumerErrorHandler = new ConsumerErrorHandler();

  constructor(private readonly apiConfig: ApiConfigService) {}

  create(): RabbitMQConfig {
    const config = this.apiConfig.rabbitMqConfig;
    const consumers = ConsumerRegistry.getAll();

    const handlers: RabbitMQHandlers = {};
    for (const consumer of consumers) {
      handlers[consumer.name] = {
        exchange: config.exchange,
        routingKey: [...consumer.routingKeys],
        queue: consumer.queue,
        queueOptions: {
          durable: true,
          channel: ORDERED_CHANNEL,
          arguments: {
            'x-dead-letter-exchange': '',
            'x-dead-letter-routing-key': `${consumer.queue}.retry`,
            'x-single-active-consumer': true,
          },
        },
        errorHandler: this.consumerErrorHandler.create(
          consumer.queue,
          config.consumerMaxAttempts,
        ),
      };
    }

    return {
      uri: config.url,
      exchanges: [
        {
          name: config.exchange,
          type: config.exchangeType,
          options: { durable: true },
        },
      ],
      queues: consumers.flatMap((consumer) => [
        {
          name: `${consumer.queue}.retry`,
          options: {
            durable: true,
            arguments: {
              'x-message-ttl': config.consumerRetryDelayMs,
              'x-dead-letter-exchange': '',
              'x-dead-letter-routing-key': consumer.queue,
            },
          },
        },
        { name: `${consumer.queue}.dlq`, options: { durable: true } },
      ]),
      channels: { [ORDERED_CHANNEL]: { prefetchCount: 1 } },
      defaultPublishOptions: { persistent: true },
      handlers,
      connectionInitOptions: {
        wait: false,
        reject: false,
        timeout: config.connectTimeoutMs,
      },
      prefetchCount: config.prefetch,
      enableControllerDiscovery: true,
    };
  }
}
