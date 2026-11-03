import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { EmailDelivery } from '../../domain/entities/email-delivery.entity';
import { EmailDeliveryRepository as EmailDeliveryRepositoryPort } from '../../domain/repositories/email-delivery.repository';
import { EmailDeliveryTypeormEntity } from './email-delivery.typeorm-entity';

@Injectable()
export class TypeOrmEmailDeliveryRepository implements EmailDeliveryRepositoryPort {
  constructor(
    @InjectRepository(EmailDeliveryTypeormEntity)
    private readonly repository: Repository<EmailDeliveryTypeormEntity>,
  ) {}

  async recordIfNew(delivery: EmailDelivery): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .insert()
      .into(EmailDeliveryTypeormEntity)
      .values({
        id: delivery.id,
        recipientEmail: delivery.recipientEmail,
        subject: delivery.subject,
        status: delivery.status,
        failureReason: null,
        sentAt: null,
        isDeleted: false,
      })
      .orIgnore()
      .returning(['id'])
      .execute();

    return result.raw.length > 0;
  }

  async save(delivery: EmailDelivery): Promise<void> {
    await this.repository.update(delivery.id, {
      status: delivery.status,
      failureReason: delivery.failureReason ?? null,
      sentAt: delivery.sentAt ?? null,
    });
  }

  async deleteCreatedBefore(before: Date): Promise<number> {
    const result = await this.repository.delete({
      createdAt: LessThan(before),
    });
    return result.affected ?? 0;
  }
}
