import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosError, isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { PeerService } from 'shared/application/http/peer-service.enum';
import {
  PeerServiceRequestException,
  PeerServiceUnavailableException,
} from 'shared/application/http/peer-service.exception';
import {
  IInternalHttpClient,
  InternalHttpGetOptions,
} from 'shared/application/ports/internal-http-client.port';
import { ApiConfigService } from 'shared/infrastructure/config/api-config.service';
import { SERVICE_TOKEN_HEADER } from 'shared/presentation/guards/service-token.guard';

interface ResponseEnvelope<T> {
  statusCode: number;
  code: string;
  data: T;
}

@Injectable()
export class InternalHttpClient implements IInternalHttpClient {
  private readonly logger = new Logger(InternalHttpClient.name);
  private readonly baseUrls: Record<PeerService, string>;
  private readonly serviceToken: string;

  constructor(
    private readonly httpService: HttpService,
    configService: ApiConfigService,
  ) {
    const { identityUrl, tenancyUrl } = configService.peerServices;
    this.baseUrls = {
      [PeerService.IDENTITY]: identityUrl,
      [PeerService.TENANCY]: tenancyUrl,
    };
    this.serviceToken = configService.auth.serviceToken;
  }

  async get<T>(
    service: PeerService,
    path: string,
    options: InternalHttpGetOptions = {},
  ): Promise<T> {
    const baseUrl = this.baseUrls[service];
    if (!baseUrl) {
      throw new PeerServiceUnavailableException(service, 'URL not configured');
    }

    const startedAt = Date.now();
    try {
      const response = await firstValueFrom(
        this.httpService.get<ResponseEnvelope<T>>(path, {
          baseURL: baseUrl,
          params: options.query,
          headers: this.buildHeaders(options),
        }),
      );
      this.logger.debug(
        `GET ${service}${path} ${response.status} (${Date.now() - startedAt}ms)`,
      );
      return response.data.data;
    } catch (error) {
      throw this.toPeerException(service, path, options, error, startedAt);
    }
  }

  private buildHeaders(
    options: InternalHttpGetOptions,
  ): Record<string, string> {
    if (options.bearerToken) {
      return { Authorization: `Bearer ${options.bearerToken}` };
    }
    return { [SERVICE_TOKEN_HEADER]: this.serviceToken };
  }

  private toPeerException(
    service: PeerService,
    path: string,
    options: InternalHttpGetOptions,
    error: unknown,
    startedAt: number,
  ): Error {
    const elapsed = Date.now() - startedAt;
    if (!isAxiosError(error) || !error.response) {
      const reason = describeNetworkError(error);
      this.logger.warn(
        `GET ${service}${path} failed: ${reason} (${elapsed}ms)`,
      );
      return new PeerServiceUnavailableException(service, reason);
    }

    const { status, data } = error.response as NonNullable<
      AxiosError<Partial<ResponseEnvelope<unknown>>>['response']
    >;
    this.logger.warn(`GET ${service}${path} ${status} (${elapsed}ms)`);

    // A rejected service token is a deployment mistake, not the end user's fault.
    const isServiceAuthError =
      !options.bearerToken && (status === 401 || status === 403);
    if (status >= 500 || isServiceAuthError) {
      return new PeerServiceUnavailableException(service, `HTTP ${status}`);
    }
    return new PeerServiceRequestException(
      service,
      status,
      typeof data?.code === 'string' ? data.code : 'BAD_REQUEST',
    );
  }
}

function describeNetworkError(error: unknown): string {
  if (isAxiosError(error)) {
    return error.code === AxiosError.ECONNABORTED ||
      error.code === AxiosError.ETIMEDOUT
      ? 'timeout'
      : (error.code ?? error.message);
  }
  return error instanceof Error ? error.message : String(error);
}
