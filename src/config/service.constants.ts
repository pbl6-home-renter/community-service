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
  static readonly PATH = 'sample';

  static readonly TITLE = 'NestJS Clean Architecture API';

  static readonly DESCRIPTION =
    'Production-grade boilerplate using DDD, CQRS, and Clean Architecture';

  /** Used when neither `DATABASE_URL` nor `DB_DATABASE` is set. */
  static readonly DEFAULT_DATABASE_NAME = 'app_db';

  private constructor() {}
}
