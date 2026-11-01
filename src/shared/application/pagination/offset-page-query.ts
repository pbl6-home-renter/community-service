import { SortOrder } from 'shared/domain/value-objects/sort-order.vo';

export interface OffsetPageQuery<TFilter = Record<string, unknown>> {
  pageNo: number;
  pageSize: number;
  sort?: string;
  order?: SortOrder;
  filter?: TFilter;
}
