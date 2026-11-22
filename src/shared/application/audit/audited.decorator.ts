import 'reflect-metadata';

export const AUDITED_METADATA_KEY = Symbol('AUDITED');

export interface AuditedOptions<TCommand, TResult> {
  action: string;
  entityType: string;
  actorId: (command: TCommand, result: TResult) => string | null;
  entityId: (command: TCommand, result: TResult) => string | null;
  metadata?: (command: TCommand, result: TResult) => Record<string, unknown>;
  skipIf?: (command: TCommand, result: TResult) => boolean;
  onError?: 'log' | 'throw';
}

export function Audited<TCommand, TResult>(
  options: AuditedOptions<TCommand, TResult>,
): MethodDecorator {
  return (_target, _propertyKey, descriptor) => {
    Reflect.defineMetadata(
      AUDITED_METADATA_KEY,
      options,
      descriptor.value as object,
    );
  };
}
