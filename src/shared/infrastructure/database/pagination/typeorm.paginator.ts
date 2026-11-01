import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { TypeOrmOffsetPaginator } from './offset.paginator';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';

export class TypeOrmPaginator {
  public static offset<TEntity extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<TEntity>,
    options: OffsetPageQuery,
  ): TypeOrmOffsetPaginator<TEntity> {
    return TypeOrmOffsetPaginator.of(queryBuilder, options);
  }
}
