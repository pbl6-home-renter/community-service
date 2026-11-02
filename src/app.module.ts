import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingExceptionFilter } from 'shared/presentation/http/filters/error-handling-exception.filter';
import { ResponseTransformInterceptor } from 'shared/presentation/http/interceptors/response-transform.interceptor';
import { SharedModule } from 'shared/shared.module';
import { SecurityModule } from 'shared/security.module';
import { HealthModule } from 'modules/health/health.module';
import { OutboxModule } from 'modules/outbox/outbox.module';
import { ConversationModule } from 'modules/conversation/conversation.module';
import { NotificationModule } from 'modules/notification/notification.module';
import { NotificationPreferenceModule } from 'modules/notification-preference/notification-preference.module';
import { PushDeviceModule } from 'modules/push-device/push-device.module';

@Module({
  imports: [
    SharedModule,
    SecurityModule,
    ConversationModule,
    NotificationModule,
    NotificationPreferenceModule,
    PushDeviceModule,
    OutboxModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: LoggingExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },
  ],
})
export class AppModule {}
