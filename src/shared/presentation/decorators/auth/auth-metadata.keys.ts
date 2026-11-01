/** Reflector metadata keys set by the auth decorators and read by the global guards. */
export class AuthMetadataKeys {
  static readonly IS_PUBLIC = 'isPublic';
  static readonly ROLES = 'roles';
  static readonly ALLOW_LOCKED = 'allowLocked';
  static readonly INTERNAL_ONLY = 'internalOnly';

  private constructor() {}
}
