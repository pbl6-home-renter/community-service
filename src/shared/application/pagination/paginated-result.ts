import { OffsetPageInfo } from './offset-page-info';

export interface PaginatedResult<T> {
  data: T[];
  pagination: OffsetPageInfo;
}
