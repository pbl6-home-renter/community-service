import { IntegrationEvent } from '../messaging/integration-event';

export interface PublishOptions {
  timeoutMs?: number;
}

export interface IMessageBrokerPublisher {
  publishWithConfirm(
    event: IntegrationEvent,
    options?: PublishOptions,
  ): Promise<void>;
}
