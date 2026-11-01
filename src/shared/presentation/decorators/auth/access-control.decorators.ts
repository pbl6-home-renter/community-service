import { SetMetadata } from '@nestjs/common';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { AuthMetadataKeys } from './auth-metadata.keys';

/** Skips access-token verification. A valid token, if sent, is still attached to `request.user`. */
export const Public = () => SetMetadata(AuthMetadataKeys.IS_PUBLIC, true);

/** Restricts the handler to the given roles. */
export const Roles = (...roles: UserRole[]) =>
  SetMetadata(AuthMetadataKeys.ROLES, roles);

/**
 * Lets a locked account call the handler. Without arguments every role is
 * allowed; with roles only those may (e.g. `@AllowLocked(UserRole.TENANT)`:
 * a locked tenant can still pay invoices, a locked landlord cannot manage).
 */
export const AllowLocked = (...roles: UserRole[]) =>
  SetMetadata(AuthMetadataKeys.ALLOW_LOCKED, roles);
