import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  getConfigBoolean,
  getConfigNumber,
  getConfigString,
} from './config-value';
import { DatabaseConfig, resolveDatabaseConfig } from './database.config';
import { OutboxConfig } from 'shared/application/messaging/outbox.config';
import { RabbitMqConfig } from './rabbitmq.config';
import { AuthConfig } from './auth.config';
import { PeerServicesConfig } from './peer-services.config';

@Injectable()
export class ApiConfigService {
  constructor(private readonly configService: ConfigService) {}

  get appName(): string {
    return getConfigString(this.configService, 'APP_NAME', 'MyApp');
  }

  get databaseConfig(): DatabaseConfig {
    return resolveDatabaseConfig((key) => this.configService.get<string>(key));
  }

  get rabbitMqConfig(): RabbitMqConfig {
    return {
      url: getConfigString(
        this.configService,
        'RABBITMQ_URL',
        'amqp://localhost:5672',
      ),
      exchange: getConfigString(
        this.configService,
        'RABBITMQ_EXCHANGE',
        `${this.appName}.events`,
      ),
      exchangeType: getConfigString(
        this.configService,
        'RABBITMQ_EXCHANGE_TYPE',
        'topic',
      ),
      prefetch: getConfigNumber(this.configService, 'RABBITMQ_PREFETCH', 10),
      connectTimeoutMs: getConfigNumber(
        this.configService,
        'RABBITMQ_CONNECT_TIMEOUT_MS',
        10000,
      ),
      publishMandatory: getConfigBoolean(
        this.configService,
        'RABBITMQ_PUBLISH_MANDATORY',
        true,
      ),
      consumerMaxAttempts: getConfigNumber(
        this.configService,
        'RABBITMQ_CONSUMER_MAX_ATTEMPTS',
        5,
      ),
      consumerRetryDelayMs: getConfigNumber(
        this.configService,
        'RABBITMQ_CONSUMER_RETRY_DELAY_MS',
        10000,
      ),
    };
  }

  get outboxConfig(): OutboxConfig {
    return {
      relayEnabled: getConfigBoolean(
        this.configService,
        'OUTBOX_RELAY_ENABLED',
        true,
      ),
      relayIntervalMs: getConfigNumber(
        this.configService,
        'OUTBOX_RELAY_INTERVAL_MS',
        1000,
      ),
      relayBatchSize: getConfigNumber(
        this.configService,
        'OUTBOX_RELAY_BATCH_SIZE',
        100,
      ),
      publishTimeoutMs: getConfigNumber(
        this.configService,
        'OUTBOX_PUBLISH_TIMEOUT_MS',
        5000,
      ),
      claimTimeoutMs: getConfigNumber(
        this.configService,
        'OUTBOX_CLAIM_TIMEOUT_MS',
        60000,
      ),
      maxAttempts: getConfigNumber(
        this.configService,
        'OUTBOX_MAX_ATTEMPTS',
        10,
      ),
      retryBaseDelayMs: getConfigNumber(
        this.configService,
        'OUTBOX_RETRY_BASE_DELAY_MS',
        1000,
      ),
      retryMaxDelayMs: getConfigNumber(
        this.configService,
        'OUTBOX_RETRY_MAX_DELAY_MS',
        60000,
      ),
      retentionMs: getConfigNumber(
        this.configService,
        'OUTBOX_RETENTION_MS',
        604800000,
      ),
    };
  }
  get serverPort(): number {
    return getConfigNumber(this.configService, 'PORT', 3001);
  }
  get enableSwagger(): boolean {
    return getConfigBoolean(this.configService, 'ENABLE_DOCUMENTATION', true);
  }

  get logLevel(): string {
    return getConfigString(this.configService, 'LOG_LEVEL', 'debug');
  }

  get auth(): AuthConfig {
    return {
      jwksUrl: getConfigString(this.configService, 'JWKS_URL', ''),
      publicKey: getConfigString(this.configService, 'JWT_PUBLIC_KEY', ''),
      issuer: getConfigString(
        this.configService,
        'JWT_ISSUER',
        'rentify-identity',
      ),
      audience: getConfigString(
        this.configService,
        'JWT_AUDIENCE',
        'rentify-api',
      ),
      serviceToken: getConfigString(this.configService, 'SERVICE_TOKEN', ''),
    };
  }

  get peerServices(): PeerServicesConfig {
    return {
      identityUrl: getConfigString(
        this.configService,
        'IDENTITY_SERVICE_URL',
        '',
      ),
      tenancyUrl: getConfigString(
        this.configService,
        'TENANCY_SERVICE_URL',
        '',
      ),
      timeoutMs: getConfigNumber(
        this.configService,
        'INTERNAL_HTTP_TIMEOUT_MS',
        3000,
      ),
    };
  }
}
