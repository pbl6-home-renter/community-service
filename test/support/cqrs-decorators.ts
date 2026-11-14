type HandlerClass = Function;

export function CommandHandler(
  ..._metadata: unknown[]
): (target: HandlerClass) => void {
  return () => undefined;
}

export function QueryHandler(
  ..._metadata: unknown[]
): (target: HandlerClass) => void {
  return () => undefined;
}

export function EventsHandler(
  ..._metadata: unknown[]
): (target: HandlerClass) => void {
  return () => undefined;
}
