import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { AuthErrorCode } from 'shared/application/auth/auth-error-code';
import { AuthMetadataKeys } from '../decorators/auth/auth-metadata.keys';
import { ApiConfigService } from 'shared/infrastructure/config/api-config.service';

export const SERVICE_TOKEN_HEADER = 'x-service-token';

/** Authenticates `@InternalOnly()` handlers with the shared `SERVICE_TOKEN`. */
@Injectable()
export class ServiceTokenGuard implements CanActivate {
  private readonly expectedDigest: Buffer | undefined;

  constructor(
    private readonly reflector: Reflector,
    configService: ApiConfigService,
  ) {
    const { serviceToken } = configService.auth;
    this.expectedDigest = serviceToken ? digest(serviceToken) : undefined;
  }

  canActivate(context: ExecutionContext): boolean {
    const isInternal = this.reflector.getAllAndOverride<boolean>(
      AuthMetadataKeys.INTERNAL_ONLY,
      [context.getHandler(), context.getClass()],
    );
    if (!isInternal) return true;

    const provided = context
      .switchToHttp()
      .getRequest<Request>()
      .header(SERVICE_TOKEN_HEADER);

    // Comparing fixed-length digests keeps the check constant-time.
    if (
      !this.expectedDigest ||
      !provided ||
      !timingSafeEqual(digest(provided), this.expectedDigest)
    ) {
      throw new UnauthorizedException({ code: AuthErrorCode.UNAUTHORIZED });
    }
    return true;
  }
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}
