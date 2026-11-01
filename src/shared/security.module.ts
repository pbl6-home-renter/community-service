import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AccessTokenVerifier } from 'shared/infrastructure/security/access-token-verifier.service';
import { ServiceTokenGuard } from 'shared/presentation/guards/service-token.guard';
import { JwtAuthGuard } from 'shared/presentation/guards/jwt-auth.guard';
import { ActiveUserGuard } from 'shared/presentation/guards/active-user.guard';
import { RolesGuard } from 'shared/presentation/guards/roles.guard';

/**
 * Registers the global guards, in order:
 * service token (internal routes) -> access token -> roles -> locked account.
 * Every guard must pass; the order only decides which error wins, so a role
 * that may never call the route gets FORBIDDEN before ACCOUNT_LOCKED.
 */
@Module({
  providers: [
    AccessTokenVerifier,
    { provide: APP_GUARD, useClass: ServiceTokenGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ActiveUserGuard },
  ],
  exports: [AccessTokenVerifier],
})
export class SecurityModule {}
