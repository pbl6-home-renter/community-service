const VIETNAMESE_LOWER_LETTERS =
  'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ';

const ACCENTED_LETTERS =
  VIETNAMESE_LOWER_LETTERS + VIETNAMESE_LOWER_LETTERS.toUpperCase();

const BASE_LETTERS = [...ACCENTED_LETTERS]
  .map((letter) =>
    letter
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace('đ', 'd')
      .replace('Đ', 'D'),
  )
  .join('');

/**
 * Wraps a SQL expression so it compares without Vietnamese diacritics or case.
 * Uses the built-in translate() so no PostgreSQL extension is required.
 */
export function foldVietnameseSql(expression: string): string {
  return `LOWER(TRANSLATE(${expression}, '${ACCENTED_LETTERS}', '${BASE_LETTERS}'))`;
}

/** Builds a LIKE "contains" pattern where %, _ and \ in the keyword are literal. */
export function containsLikePattern(keyword: string): string {
  return `%${keyword.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}
