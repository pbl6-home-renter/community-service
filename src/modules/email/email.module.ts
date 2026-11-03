import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailSendRequestedCommandHandler } from './application/commands/email-send-requested/email-send-requested.command.handler';
import { EmailDeliveryRetentionService } from './application/services/email-delivery-retention.service';
import { EmailDeliveryTypeormEntity } from './infrastructure/persistence/email-delivery.typeorm-entity';
import { TypeOrmEmailDeliveryRepository } from './infrastructure/persistence/email-delivery.repository';
import { SmtpEmailSender } from './infrastructure/delivery/smtp-email.sender';
import { EmailDeliveryRetentionScheduler } from './infrastructure/scheduler/email-delivery-retention.scheduler';
import { EMAIL_DI_TOKEN } from './email.di-token';
import { EmailSendRequestedSubscriber } from './presentation/messaging/email-send-requested.subscriber';

const commandHandlers = [EmailSendRequestedCommandHandler];

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([EmailDeliveryTypeormEntity])],
  providers: [
    ...commandHandlers,
    EmailSendRequestedSubscriber,
    EmailDeliveryRetentionService,
    EmailDeliveryRetentionScheduler,
    SmtpEmailSender,
    {
      provide: EMAIL_DI_TOKEN.DELIVERY_REPOSITORY,
      useClass: TypeOrmEmailDeliveryRepository,
    },
    {
      provide: EMAIL_DI_TOKEN.SENDER,
      useExisting: SmtpEmailSender,
    },
  ],
  exports: [EMAIL_DI_TOKEN.SENDER],
})
export class EmailModule {}
