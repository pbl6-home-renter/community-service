export interface PeerServicesConfig {
  /** Base URL of Identity-Service on the private network, e.g. `http://identity:3001`. */
  identityUrl: string;
  /** Base URL of Tenancy-Service on the private network, e.g. `http://tenancy:3002`. */
  tenancyUrl: string;
  /** Base URL of Community-Service on the private network, e.g. `http://community:3004`. */
  communityUrl: string;
  /** Per-request timeout for internal HTTP calls. */
  timeoutMs: number;
}
