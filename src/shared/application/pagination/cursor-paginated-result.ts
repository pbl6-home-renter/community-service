import { CursorPageInfo } from './cursor-page-info';

export interface CursorPaginatedResult<T> {
  data: T[];
  pagination: CursorPageInfo;
}
