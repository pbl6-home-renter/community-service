import type { JWTPayload } from 'jose';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { UserStatus } from 'shared/domain/enums/user-status.enum';

/** Custom claims of an Identity-Service access token (registered claims are validated by jose). */
export interface JwtPayload extends JWTPayload {
  sub?: string;
  role?: UserRole;
  status?: UserStatus;
}
