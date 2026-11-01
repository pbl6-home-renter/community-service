import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { ApiConfigService } from 'shared/infrastructure/config/api-config.service';
import { ServiceConstants } from 'config/service.constants';

export function configureSwagger(
  app: INestApplication,
  configService: ApiConfigService,
) {
  if (configService.enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle(ServiceConstants.TITLE)
      .setDescription(ServiceConstants.DESCRIPTION)
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(`${ServiceConstants.PATH}/swagger`, app, document, {
      useGlobalPrefix: true,
      jsonDocumentUrl: `${ServiceConstants.PATH}/swagger/json`,
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }
}
