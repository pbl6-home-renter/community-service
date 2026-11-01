import { randomUUID } from 'node:crypto';

export type Uuid = string & { _uuidBrand: undefined };

export const EMPTY_UUID = '00000000-0000-0000-0000-000000000000' as Uuid;

export function isNullUuid(uuid: Uuid | null | undefined): boolean {
  if (!uuid) {
    return true;
  }
  return uuid === EMPTY_UUID;
}

export function isValidUuid(uuid?: string | null): boolean {
  if (!uuid) {
    return false;
  }
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    uuid,
  );
}

export function generateUuid(): Uuid {
  return randomUUID() as Uuid;
}
