import { Injectable, Logger } from '@nestjs/common';
import { importPKCS8, SignJWT } from 'jose';
import { ApiConfigService } from 'shared/infrastructure/config/api-config.service';
import {
  FcmMessageSendResult,
  FcmMessageSenderPort,
} from '../../application/ports/fcm-message-sender.port';
import { PushMessage } from '../../application/ports/push-delivery.port';

interface GoogleAccessTokenResponse {
  access_token: string;
  expires_in: number;
}

interface FcmErrorResponse {
  error?: {
    status?: string;
    details?: Array<{
      errorCode?: string;
      fieldViolations?: Array<{ field?: string }>;
    }>;
  };
}

const FCM_REQUEST_TIMEOUT_MS = 5_000;
// Refresh the OAuth token this long before Google says it expires.
const ACCESS_TOKEN_REFRESH_MARGIN_MS = 60_000;

// FCM rejects the whole message when `data` uses one of these keys.
const RESERVED_DATA_KEYS = new Set([
  'from',
  'notification',
  'message_type',
  'collapse_key',
]);
const RESERVED_DATA_KEY_PREFIXES = ['google', 'gcm'];

@Injectable()
export class FirebaseCloudMessagingSender implements FcmMessageSenderPort {
  private readonly logger = new Logger(FirebaseCloudMessagingSender.name);
  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;
  private accessTokenRequest: Promise<string> | null = null;
  private missingCredentialsLogged = false;

  constructor(private readonly config: ApiConfigService) {}

  isEnabled(): boolean {
    const { projectId, clientEmail, privateKey } = this.config.fcm;
    if (projectId && clientEmail && privateKey) return true;
    if (!this.missingCredentialsLogged) {
      this.logger.warn('FCM is not configured; push delivery is disabled');
      this.missingCredentialsLogged = true;
    }
    return false;
  }

  async send(
    token: string,
    message: PushMessage,
  ): Promise<FcmMessageSendResult> {
    const { projectId, clientEmail, privateKey } = this.config.fcm;
    const accessToken = await this.getAccessToken(clientEmail, privateKey);
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: message.title, body: message.body },
            data: this.withoutReservedKeys(message.data),
          },
        }),
        signal: AbortSignal.timeout(FCM_REQUEST_TIMEOUT_MS),
      },
    );
    if (response.ok) return 'sent';

    if (response.status === 401) {
      // Google can revoke the access token before it expires; fetch a new one next time.
      this.accessToken = null;
      this.accessTokenExpiresAt = 0;
    }
    const error = (await response.json().catch(() => ({}))) as FcmErrorResponse;
    if (this.isInvalidToken(error)) return 'invalid-token';
    throw new Error(`FCM request failed with status ${response.status}`);
  }

  /**
   * UNREGISTERED: the app was uninstalled or the token expired.
   * INVALID_ARGUMENT on `message.token`: the token is malformed. Other
   * INVALID_ARGUMENT errors are payload problems and must not revoke the device.
   */
  private isInvalidToken(error: FcmErrorResponse): boolean {
    return (
      error.error?.details?.some(
        (detail) =>
          detail.errorCode === 'UNREGISTERED' ||
          detail.fieldViolations?.some(
            (violation) => violation.field === 'message.token',
          ),
      ) ?? false
    );
  }

  private withoutReservedKeys(
    data: Record<string, string>,
  ): Record<string, string> {
    return Object.fromEntries(
      Object.entries(data).filter(
        ([key]) =>
          !RESERVED_DATA_KEYS.has(key) &&
          !RESERVED_DATA_KEY_PREFIXES.some((prefix) => key.startsWith(prefix)),
      ),
    );
  }

  private async getAccessToken(
    clientEmail: string,
    privateKey: string,
  ): Promise<string> {
    if (
      this.accessToken &&
      Date.now() < this.accessTokenExpiresAt - ACCESS_TOKEN_REFRESH_MARGIN_MS
    ) {
      return this.accessToken;
    }
    if (this.accessTokenRequest) return this.accessTokenRequest;

    this.accessTokenRequest = this.requestAccessToken(clientEmail, privateKey);
    try {
      return await this.accessTokenRequest;
    } finally {
      this.accessTokenRequest = null;
    }
  }

  private async requestAccessToken(
    clientEmail: string,
    privateKey: string,
  ): Promise<string> {
    const key = await importPKCS8(privateKey, 'RS256');
    const assertion = await new SignJWT({
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setIssuer(clientEmail)
      .setSubject(clientEmail)
      .setAudience('https://oauth2.googleapis.com/token')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(key);
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
      signal: AbortSignal.timeout(FCM_REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(
        `FCM OAuth token request failed with status ${response.status}`,
      );
    }
    const result = (await response.json()) as GoogleAccessTokenResponse;
    this.accessToken = result.access_token;
    this.accessTokenExpiresAt = Date.now() + result.expires_in * 1000;
    return result.access_token;
  }
}
