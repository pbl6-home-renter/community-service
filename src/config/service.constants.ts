/**
 * Everything that differs between services built from this boilerplate.
 * `shared/` reads these values and must stay identical across services, so
 * edit this class (not `shared/`) when forking.
 */
export class ServiceConstants {
  /**
   * This service's path segment behind the API Gateway (e.g. `tenancy`). Health and Swagger
   * are served under `/api/v1/<PATH>/health` and `/api/v1/<PATH>/swagger`, so
   * the gateway can route them to the right service.
   */
  static readonly PATH = 'community';

  static readonly TITLE = 'Rentify Community Service API';

  static readonly DESCRIPTION =
    'Chat and notification service for Rentify';

  /** Used when neither `DATABASE_URL` nor `DB_DATABASE` is set. */
  static readonly DEFAULT_DATABASE_NAME = 'community_db';

  private constructor() {}
}
