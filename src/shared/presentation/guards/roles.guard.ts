import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthErrorCode } from 'shared/application/auth/auth-error-code';
import { AuthMetadataKeys } from '../decorators/auth/auth-metadata.keys';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { AuthenticatedRequest } from '../http/authenticated-request';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(
      AuthMetadataKeys.ROLES,
      [context.getHandler(), context.getClass()],
    );

    if (!roles || roles.length === 0) {
      return true;
    }

    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException({ code: AuthErrorCode.FORBIDDEN });
    }

    return true;
  }
}
