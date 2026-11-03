import { Injectable, Logger } from '@nestjs/common';
import { importPKCS8, SignJWT } from 'jose';
import { ApiConfigService } from 'shared/infrastructure/config/api-config.service';
import { FcmMessageSenderPort } from '../../application/ports/fcm-message-sender.port';
import { PushMessage } from '../../application/ports/push-delivery.port';

interface GoogleAccessTokenResponse {
  access_token: string;
  expires_in: number;
}

interface FcmErrorResponse {
  error?: {
    status?: string;
    details?: Array<{ errorCode?: string }>;
  };
}

@Injectable()
export class FirebaseCloudMessagingSender implements FcmMessageSenderPort {
  private readonly logger = new Logger(FirebaseCloudMessagingSender.name);
  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;
  private accessTokenRequest: Promise<string> | null = null;
  private missingCredentialsLogged = false;

  constructor(private readonly config: ApiConfigService) {}

  async send(
    token: string,
    message: PushMessage,
  ): Promise<'sent' | 'unregistered' | 'disabled'> {
    const { projectId, clientEmail, privateKey } = this.config.fcm;
    if (!projectId || !clientEmail || !privateKey) {
      if (!this.missingCredentialsLogged) {
        this.logger.warn('FCM is not configured; push delivery is disabled');
        this.missingCredentialsLogged = true;
      }
      return 'disabled';
    }

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
            data: message.data,
          },
        }),
        signal: AbortSignal.timeout(5000),
      },
    );
    if (response.ok) return 'sent';

    const error = (await response.json().catch(() => ({}))) as FcmErrorResponse;
    if (
      error.error?.details?.some(
        (detail) => detail.errorCode === 'UNREGISTERED',
      )
    ) {
      return 'unregistered';
    }
    throw new Error(`FCM request failed with status ${response.status}`);
  }

  private async getAccessToken(
    clientEmail: string,
    privateKey: string,
  ): Promise<string> {
    if (this.accessToken && Date.now() < this.accessTokenExpiresAt - 60_000) {
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
      signal: AbortSignal.timeout(5000),
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
