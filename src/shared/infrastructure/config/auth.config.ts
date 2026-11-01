export interface AuthConfig {
  /** Identity-Service JWKS endpoint. Takes precedence over `publicKey`. */
  jwksUrl: string;
  /** PEM public key; used by Identity-Service, which owns the key pair. */
  publicKey: string;
  issuer: string;
  audience: string;
  /** Shared secret for `internal/*` service-to-service endpoints. Empty disables them. */
  serviceToken: string;
}
