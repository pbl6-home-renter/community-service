import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { SortOrder } from 'shared/domain/value-objects/sort-order.vo';

export interface SortOptionConfig {
  whitelist: string[];
  defaultSort: string;
  defaultOrder?: SortOrder;
  tieBreakerField?: string;
  alias?: string;
}

export function applySortingToQueryBuilder<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  options: { sort?: string; order?: SortOrder },
  config: SortOptionConfig,
): void {
  const {
    whitelist,
    defaultSort,
    defaultOrder = 'asc',
    tieBreakerField = 'id',
    alias,
  } = config;

  let sortField = defaultSort;
  const sortOrder = options.order || defaultOrder;

  if (options.sort) {
    if (!whitelist.includes(options.sort)) {
      throw new ValidationException(
        `Sort field '${options.sort}' is not allowed. Whitelist: ${whitelist.join(', ')}`,
      );
    }
    sortField = options.sort;
  } else if (options.order) {
    sortField = defaultSort;
  }

  const prefix = alias ? `${alias}.` : '';
  const orderDirection = sortOrder.toUpperCase() as 'ASC' | 'DESC';

  queryBuilder.orderBy(`${prefix}${sortField}`, orderDirection);

  if (tieBreakerField && sortField !== tieBreakerField) {
    queryBuilder.addOrderBy(`${prefix}${tieBreakerField}`, 'ASC');
  }
}
