import {
  EMPTY_UUID,
  generateUuid,
  isNullUuid,
  isValidUuid,
} from 'shared/domain/value-objects/uuid.vo';

describe('Uuid value object helpers', () => {
  it('generates valid, distinct ids', () => {
    const first = generateUuid();
    const second = generateUuid();

    expect(isValidUuid(first)).toBe(true);
    expect(isValidUuid(second)).toBe(true);
    expect(second).not.toBe(first);
  });

  it('rejects malformed UUIDs and identifies empty UUID values', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false);
    expect(isValidUuid(null)).toBe(false);
    expect(isNullUuid(null)).toBe(true);
    expect(isNullUuid(EMPTY_UUID)).toBe(true);
    expect(isNullUuid(generateUuid())).toBe(false);
  });
});
