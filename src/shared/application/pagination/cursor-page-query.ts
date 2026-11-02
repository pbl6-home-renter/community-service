export const DEFAULT_CURSOR_PAGE_SIZE = 30;
export const MAX_CURSOR_PAGE_SIZE = 100;

export interface CursorPageQuery {
  cursor?: string;
  pageSize: number;
}
