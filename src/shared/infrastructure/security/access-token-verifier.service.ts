import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createRemoteJWKSet,
  importSPKI,
  jwtVerify,
  type JWTVerifyGetKey,
} from 'jose';
import { AuthErrorCode } from 'shared/application/auth/auth-error-code';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { UserStatus } from 'shared/domain/enums/user-status.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { JwtPayload } from './jwt-payload';
import { isValidUuid } from 'shared/domain/value-objects/uuid.vo';
import { ApiConfigService } from '../config/api-config.service';

/** jose error codes caused by the token itself; anything else means the key source failed. */
const INVALID_TOKEN_ERROR_CODES = new Set([
  'ERR_JWT_EXPIRED',
  'ERR_JWT_CLAIM_VALIDATION_FAILED',
  'ERR_JWT_INVALID',
  'ERR_JWS_INVALID',
  'ERR_JWS_SIGNATURE_VERIFICATION_FAILED',
  'ERR_JWKS_NO_MATCHING_KEY',
  'ERR_JWKS_MULTIPLE_MATCHING_KEYS',
  'ERR_JOSE_ALG_NOT_ALLOWED',
  'ERR_JOSE_NOT_SUPPORTED',
]);

const JWKS_CACHE_MAX_AGE_MS = 5 * 60 * 1000;
const CLOCK_TOLERANCE_SECONDS = 5;

/**
 * Verifies Identity-Service RS256 access tokens locally. Every service does
 * this itself instead of trusting gateway headers, so a caller inside the
 * private network cannot impersonate a user.
 *
 * Key source: `JWKS_URL` (cached, no network hop per request) or, for
 * Identity-Service itself, `JWT_PUBLIC_KEY`.
 */
@Injectable()
export class AccessTokenVerifier {
  private readonly logger = new Logger(AccessTokenVerifier.name);
  private readonly getKey: JWTVerifyGetKey;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(configService: ApiConfigService) {
    const { jwksUrl, publicKey, issuer, audience } = configService.auth;
    this.issuer = issuer;
    this.audience = audience;

    if (jwksUrl) {
      this.getKey = createRemoteJWKSet(new URL(jwksUrl), {
        cacheMaxAge: JWKS_CACHE_MAX_AGE_MS,
      });
    } else if (publicKey) {
      const key = importSPKI(publicKey, 'RS256');
      this.getKey = () => key;
    } else {
      throw new Error('Either JWKS_URL or JWT_PUBLIC_KEY must be set');
    }
  }

  async verify(token: string): Promise<AuthenticatedUser> {
    let payload: JwtPayload;
    try {
      ({ payload } = await jwtVerify<JwtPayload>(token, this.getKey, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['RS256'],
        clockTolerance: CLOCK_TOLERANCE_SECONDS,
      }));
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code && INVALID_TOKEN_ERROR_CODES.has(code)) {
        throw new UnauthorizedException({ code: AuthErrorCode.UNAUTHORIZED });
      }
      this.logger.error(`Cannot load token verification key: ${String(error)}`);
      throw new ServiceUnavailableException({
        code: AuthErrorCode.AUTH_UNAVAILABLE,
      });
    }

    if (
      !isValidUuid(payload.sub) ||
      !Object.values(UserRole).includes(payload.role as UserRole) ||
      !Object.values(UserStatus).includes(payload.status as UserStatus)
    ) {
      throw new UnauthorizedException({ code: AuthErrorCode.UNAUTHORIZED });
    }

    return {
      id: payload.sub as Uuid,
      role: payload.role as UserRole,
      status: payload.status as UserStatus,
    };
  }
}
