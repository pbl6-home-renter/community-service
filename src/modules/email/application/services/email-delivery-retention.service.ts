import { Inject, Injectable } from '@nestjs/common';
import { EMAIL_DI_TOKEN } from '../../email.di-token';
import { EmailDeliveryRepository } from '../../domain/repositories/email-delivery.repository';

@Injectable()
export class EmailDeliveryRetentionService {
  constructor(
    @Inject(EMAIL_DI_TOKEN.DELIVERY_REPOSITORY)
    private readonly deliveries: EmailDeliveryRepository,
  ) {}

  purgeCreatedBefore(before: Date): Promise<number> {
    return this.deliveries.deleteCreatedBefore(before);
  }
}
