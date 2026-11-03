import { Module } from '@nestjs/common';
import { SecurityModule } from 'shared/security.module';
import { SocketServer } from './infrastructure/socket-server';

@Module({
  imports: [SecurityModule],
  providers: [SocketServer],
  exports: [SocketServer],
})
export class RealtimeModule {}
