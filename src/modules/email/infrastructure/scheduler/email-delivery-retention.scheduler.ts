import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ApiConfigService } from 'shared/infrastructure/config/api-config.service';
import { EmailDeliveryRetentionService } from '../../application/services/email-delivery-retention.service';

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class EmailDeliveryRetentionScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(EmailDeliveryRetentionScheduler.name);
  private timer?: NodeJS.Timeout;
  private inFlight?: Promise<void>;

  constructor(
    private readonly config: ApiConfigService,
    private readonly retention: EmailDeliveryRetentionService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => this.tick(), CLEANUP_INTERVAL_MS);
    this.tick();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.inFlight;
  }

  private tick(): void {
    if (this.inFlight) return;
    const cutoff = new Date(Date.now() - this.config.smtp.deliveryRetentionMs);
    this.inFlight = this.retention
      .purgeCreatedBefore(cutoff)
      .then((deleted) => {
        if (deleted > 0) {
          this.logger.log(`Purged ${deleted} expired email delivery records`);
        }
      })
      .catch((error: unknown) =>
        this.logger.error(
          error instanceof Error ? error.message : String(error),
        ),
      )
      .finally(() => {
        this.inFlight = undefined;
      });
  }
}
