import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationPreferenceUpdateCommandHandler } from './application/commands/notification-preference-update.command.handler';
import { NotificationPreferenceGetQueryHandler } from './application/queries/notification-preference-get.query.handler';
import { TypeOrmNotificationPreferenceRepository } from './infrastructure/persistence/notification-preference.repository';
import { NotificationPreferenceTypeormEntity } from './infrastructure/persistence/notification-preference.typeorm-entity';
import { NOTIFICATION_PREFERENCE_DI_TOKEN } from './notification-preference.di-token';
import { NotificationPreferenceController } from './presentation/http/controllers/notification-preference.controller';

const commandHandlers = [NotificationPreferenceUpdateCommandHandler];
const queryHandlers = [NotificationPreferenceGetQueryHandler];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([NotificationPreferenceTypeormEntity]),
  ],
  controllers: [NotificationPreferenceController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    {
      provide: NOTIFICATION_PREFERENCE_DI_TOKEN.REPOSITORY,
      useClass: TypeOrmNotificationPreferenceRepository,
    },
  ],
  exports: [NOTIFICATION_PREFERENCE_DI_TOKEN.REPOSITORY],
})
export class NotificationPreferenceModule {}
