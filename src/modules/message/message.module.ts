import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MESSAGE_DI_TOKEN } from './message.di-token';
import { TypeOrmMessageRepository } from './infrastructure/persistence/message.repository';
import { MessageTypeormEntity } from './infrastructure/persistence/message.typeorm-entity';

@Module({
  imports: [TypeOrmModule.forFeature([MessageTypeormEntity])],
  providers: [
    {
      provide: MESSAGE_DI_TOKEN.REPOSITORY,
      useClass: TypeOrmMessageRepository,
    },
  ],
  exports: [MESSAGE_DI_TOKEN.REPOSITORY],
})
export class MessageModule {}
