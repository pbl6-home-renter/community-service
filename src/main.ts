import type { IncomingMessage } from 'node:http';
import { Logger, RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { requestBodyErrorMiddleware } from 'shared/presentation/http/middleware/request-body-error.middleware';
import { createRequestBodyNormalizeMiddleware } from 'shared/presentation/http/middleware/request-body-normalize.middleware';
import { AppValidationPipe } from 'shared/presentation/http/pipes/app-validation.pipe';
import { configLogging } from 'shared/presentation/http/bootstrap/logging';
import { configureSwagger } from 'shared/presentation/http/bootstrap/swagger';
import { ApiConfigService } from 'shared/infrastructure/config/api-config.service';
import { SharedModule } from 'shared/shared.module';
import { createRequestBodyVerifier } from 'shared/presentation/http/middleware/request-body-verify.util';
import { ServiceConstants } from 'config/service.constants';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  app.enableShutdownHooks();

  const configService = app.select(SharedModule).get(ApiConfigService);

  app.use(cookieParser());

  // `internal/*` (service-to-service) stays outside the prefix the gateway routes.
  // CORS is handled by the API Gateway only.
  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'internal/(.*)', method: RequestMethod.ALL }],
  });

  app.useGlobalPipes(new AppValidationPipe());

  const emptyBodyRequests = new WeakSet<IncomingMessage>();
  const verifyRequestBody = createRequestBodyVerifier(emptyBodyRequests);

  app.use(json({ limit: '10mb', strict: false, verify: verifyRequestBody }));
  app.use(
    urlencoded({ extended: true, limit: '10mb', verify: verifyRequestBody }),
  );

  app.use(requestBodyErrorMiddleware);
  app.use(createRequestBodyNormalizeMiddleware(emptyBodyRequests));

  configureSwagger(app, configService);
  configLogging(app, configService);

  await app.listen(configService.serverPort);

  const appUrl = await app.getUrl();

  Logger.log(`Application running on: ${appUrl}`);
  Logger.log(
    `Swagger documentation: ${appUrl}/api/v1/${ServiceConstants.PATH}/swagger`,
  );

  return app;
}

void bootstrap();
