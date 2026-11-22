import { Global, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { AuditExplorer } from './audit.explorer';

@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [AuditExplorer],
})
export class AuditModule {}
