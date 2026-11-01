import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { INTERNAL_HTTP_DI_TOKEN } from 'shared/application/di-tokens';
import { ApiConfigService } from 'shared/infrastructure/config/api-config.service';
import { InternalHttpClient } from './internal-http-client.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ApiConfigService],
      useFactory: (configService: ApiConfigService) => ({
        timeout: configService.peerServices.timeoutMs,
      }),
    }),
  ],
  providers: [
    { provide: INTERNAL_HTTP_DI_TOKEN.CLIENT, useClass: InternalHttpClient },
  ],
  exports: [INTERNAL_HTTP_DI_TOKEN.CLIENT],
})
export class InternalHttpModule {}
