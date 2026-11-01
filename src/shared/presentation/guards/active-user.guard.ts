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
import { UserStatus } from 'shared/domain/enums/user-status.enum';
import { AuthenticatedRequest } from '../http/authenticated-request';

/** Blocks locked accounts unless `@AllowLocked()` admits their role. */
@Injectable()
export class ActiveUserGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (user?.status !== UserStatus.LOCKED) return true;

    const allowedRoles = this.reflector.getAllAndOverride<UserRole[]>(
      AuthMetadataKeys.ALLOW_LOCKED,
      [context.getHandler(), context.getClass()],
    );
    if (
      allowedRoles &&
      (allowedRoles.length === 0 || allowedRoles.includes(user.role))
    ) {
      return true;
    }

    throw new ForbiddenException({ code: AuthErrorCode.ACCOUNT_LOCKED });
  }
}
