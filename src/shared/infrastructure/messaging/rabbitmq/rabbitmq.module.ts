import { Module } from '@nestjs/common';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { MESSAGE_BROKER_DI_TOKEN } from 'shared/application/di-tokens';
import { RabbitMqConfigService } from './rabbitmq-config.service';
import { RabbitmqPublisher } from './rabbitmq.publisher';

@Module({
  imports: [RabbitMQModule.forRootAsync({ useClass: RabbitMqConfigService })],
  providers: [
    { provide: MESSAGE_BROKER_DI_TOKEN.PUBLISHER, useClass: RabbitmqPublisher },
  ],
  exports: [RabbitMQModule, MESSAGE_BROKER_DI_TOKEN.PUBLISHER],
})
export class RabbitmqModule {}
