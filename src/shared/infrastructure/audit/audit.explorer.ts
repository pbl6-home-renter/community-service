import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, ModuleRef } from '@nestjs/core';
import { AuditEntry } from 'shared/application/audit/audit-entry';
import { AUDIT_RECORDER_DI_TOKEN } from 'shared/application/audit/audit-recorder.di-token';
import { AuditRecorder } from 'shared/application/audit/audit-recorder.port';
import {
  AUDITED_METADATA_KEY,
  AuditedOptions,
} from 'shared/application/audit/audited.decorator';

type AuditedMethod = (this: unknown, ...args: unknown[]) => unknown;

@Injectable()
export class AuditExplorer implements OnModuleInit {
  private readonly logger = new Logger(AuditExplorer.name);

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly moduleRef: ModuleRef,
  ) {}

  onModuleInit(): void {
    const providers = this.discoveryService.getProviders();
    let recorder: AuditRecorder | undefined;

    for (const provider of providers) {
      const instance = provider.instance as Record<string, unknown> | undefined;
      if (!instance || typeof instance !== 'object') {
        continue;
      }

      const methodNames = this.metadataScanner.getAllMethodNames(
        Object.getPrototypeOf(instance),
      );

      for (const methodName of methodNames) {
        const method = instance[methodName];
        if (typeof method !== 'function') {
          continue;
        }

        const options = Reflect.getMetadata(AUDITED_METADATA_KEY, method) as
          AuditedOptions<unknown, unknown> | undefined;
        if (!options) {
          continue;
        }

        if (!recorder) {
          if (
            !providers.some(({ token }) => token === AUDIT_RECORDER_DI_TOKEN)
          ) {
            throw new Error(
              `@Audited method ${provider.name}.${methodName} requires an AUDIT_RECORDER_DI_TOKEN binding. Import a module that provides an AuditRecorder.`,
            );
          }

          recorder = this.moduleRef.get<AuditRecorder>(
            AUDIT_RECORDER_DI_TOKEN,
            {
              strict: false,
            },
          );
        }

        instance[methodName] = this.wrap(
          method as AuditedMethod,
          options,
          recorder,
        );
      }
    }
  }

  private wrap(
    method: AuditedMethod,
    options: AuditedOptions<unknown, unknown>,
    recorder: AuditRecorder,
  ): AuditedMethod {
    const logger = this.logger;

    return async function (
      this: unknown,
      ...args: unknown[]
    ): Promise<unknown> {
      const result = await method.apply(this, args);
      const command = args[0];
      if (options.skipIf?.(command, result)) {
        return result;
      }

      const entry: AuditEntry = {
        action: options.action,
        entityType: options.entityType,
        entityId: options.entityId(command, result),
        actorId: options.actorId(command, result),
        ...(options.metadata && {
          metadata: options.metadata(command, result),
        }),
      };

      try {
        // P11-D92: the handler has finished its transaction; audit uses its own.
        await recorder.record(entry);
      } catch (error) {
        if (options.onError === 'throw') {
          throw error;
        }

        logger.error(
          `Audit recording failed: action=${entry.action} entityId=${entry.entityId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }

      return result;
    };
  }
}
