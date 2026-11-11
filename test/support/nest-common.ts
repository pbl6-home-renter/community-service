type InjectionDecorator = ParameterDecorator & PropertyDecorator;

export function Inject(_token: unknown): InjectionDecorator {
  return (() => undefined) as InjectionDecorator;
}

export function Injectable(): ClassDecorator {
  return (target) => target;
}

export function Optional(): ParameterDecorator {
  return () => undefined;
}

export class Logger {
  constructor(..._context: unknown[]) {}

  log(..._message: unknown[]): void {}
  error(..._message: unknown[]): void {}
  warn(..._message: unknown[]): void {}
  debug(..._message: unknown[]): void {}
  verbose(..._message: unknown[]): void {}
}
