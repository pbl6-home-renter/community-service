export const isValidSystemMessageActorName = (name: string): boolean =>
  typeof name === 'string' && name.trim().length > 0 && name.length <= 254;
