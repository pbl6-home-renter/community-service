import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { applySortingToQueryBuilder, SortOptionConfig } from './sort.helper';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { OffsetPageInfo } from 'shared/application/pagination/offset-page-info';

export class TypeOrmOffsetPaginator<TEntity extends ObjectLiteral> {
  private sortConfig?: SortOptionConfig;

  constructor(
    private readonly queryBuilder: SelectQueryBuilder<TEntity>,
    private readonly options: OffsetPageQuery,
  ) {}

  public static of<TEntity extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<TEntity>,
    options: OffsetPageQuery,
  ): TypeOrmOffsetPaginator<TEntity> {
    return new TypeOrmOffsetPaginator(queryBuilder, options);
  }

  public withSort(config: SortOptionConfig): this {
    this.sortConfig = config;
    return this;
  }

  public async paginate<TDomain = TEntity>(
    mapper?: (raw: TEntity) => TDomain,
  ): Promise<PaginatedResult<TDomain>> {
    if (this.sortConfig) {
      applySortingToQueryBuilder(
        this.queryBuilder,
        this.options,
        this.sortConfig,
      );
    }

    const pageNo = this.options.pageNo > 0 ? this.options.pageNo : 1;
    const pageSize = this.options.pageSize > 0 ? this.options.pageSize : 20;
    const skip = (pageNo - 1) * pageSize;

    const [records, totalItems] = await this.queryBuilder
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    const totalPages = Math.ceil(totalItems / pageSize);
    const data = mapper
      ? records.map(mapper)
      : (records as unknown as TDomain[]);

    const pagination: OffsetPageInfo = {
      type: 'offset',
      pageNo,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: pageNo < totalPages,
      hasPreviousPage: pageNo > 1,
    };

    return {
      data,
      pagination,
    };
  }
}
