import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import {
  CursorPageQuery,
  MAX_CURSOR_PAGE_SIZE,
} from 'shared/application/pagination/cursor-page-query';
import { CursorPaginatedResult } from 'shared/application/pagination/cursor-paginated-result';
import { CursorInvalidException } from 'shared/domain/exceptions/cursor-invalid.exception';
import { SortOrder } from 'shared/domain/value-objects/sort-order.vo';

interface CursorPayload {
  version: 1;
  property: string;
  direction: SortOrder;
  value: string | number;
  id: string;
}

interface CursorSort<TEntity extends ObjectLiteral> {
  property: Extract<keyof TEntity, string>;
  direction: SortOrder;
}

type CursorEntity = ObjectLiteral & { id: string };

export class TypeOrmCursorPaginator<TEntity extends CursorEntity> {
  private sort?: CursorSort<TEntity>;

  private constructor(
    private readonly queryBuilder: SelectQueryBuilder<TEntity>,
    private readonly options: CursorPageQuery,
  ) {}

  public static of<TEntity extends CursorEntity>(
    queryBuilder: SelectQueryBuilder<TEntity>,
    options: CursorPageQuery,
  ): TypeOrmCursorPaginator<TEntity> {
    return new TypeOrmCursorPaginator(queryBuilder, options);
  }

  /**
   * Uses the selected non-null scalar property and entity id as a stable keyset.
   * Filters must be applied to the query builder before pagination.
   */
  public withSort(
    property: Extract<keyof TEntity, string>,
    direction: SortOrder = 'asc',
  ): this {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(property)) {
      throw new Error('Cursor sort property must be a simple entity property');
    }
    this.sort = { property, direction };
    return this;
  }

  public async paginate<TOutput = TEntity>(
    mapper?: (record: TEntity) => TOutput,
  ): Promise<CursorPaginatedResult<TOutput>> {
    if (!this.sort) {
      throw new Error('Cursor pagination requires a sort property');
    }

    const pageSize = this.options.pageSize;
    if (
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > MAX_CURSOR_PAGE_SIZE
    ) {
      throw new RangeError(
        `Cursor page size must be between 1 and ${MAX_CURSOR_PAGE_SIZE}`,
      );
    }

    const alias = this.queryBuilder.alias;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(alias)) {
      throw new Error('Cursor pagination requires a simple query alias');
    }

    const sortColumn = `${alias}.${this.sort.property}`;
    const idColumn = `${alias}.id`;
    const order = this.sort.direction === 'asc' ? 'ASC' : 'DESC';

    if (this.options.cursor !== undefined) {
      const cursor = this.decodeCursor(this.options.cursor);
      if (
        cursor.property !== this.sort.property ||
        cursor.direction !== this.sort.direction
      ) {
        throw new CursorInvalidException();
      }

      const comparison = this.sort.direction === 'asc' ? '>' : '<';
      this.queryBuilder.andWhere(
        `(${sortColumn} ${comparison} :__cursorValue OR (${sortColumn} = :__cursorValue AND ${idColumn} ${comparison} :__cursorId))`,
        {
          __cursorValue: cursor.value,
          __cursorId: cursor.id,
        },
      );
    }

    const records = await this.queryBuilder
      .orderBy(sortColumn, order)
      .addOrderBy(idColumn, order)
      .take(pageSize + 1)
      .getMany();
    const hasNextPage = records.length > pageSize;
    const page = records.slice(0, pageSize);
    const lastRecord = page.at(-1);
    const nextCursor =
      hasNextPage && lastRecord ? this.encodeCursor(lastRecord) : null;

    return {
      data: mapper ? page.map(mapper) : (page as unknown as TOutput[]),
      pagination: {
        type: 'cursor',
        pageSize,
        nextCursor,
        hasNextPage,
      },
    };
  }

  private encodeCursor(record: TEntity): string {
    if (!this.sort) {
      throw new Error('Cursor pagination requires a sort property');
    }

    const rawValue: unknown = record[this.sort.property];
    const value =
      rawValue instanceof Date
        ? rawValue.toISOString()
        : typeof rawValue === 'string' ||
            (typeof rawValue === 'number' && Number.isFinite(rawValue))
          ? rawValue
          : undefined;

    if (value === undefined || typeof record.id !== 'string') {
      throw new Error(
        'Cursor sort property must be a non-null string, number, or Date and the entity must have a string id',
      );
    }

    const payload: CursorPayload = {
      version: 1,
      property: this.sort.property,
      direction: this.sort.direction,
      value,
      id: record.id,
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  private decodeCursor(cursor: string): CursorPayload {
    if (cursor.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(cursor)) {
      throw new CursorInvalidException();
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as unknown;
    } catch {
      throw new CursorInvalidException();
    }

    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      !('version' in decoded) ||
      decoded.version !== 1 ||
      !('property' in decoded) ||
      typeof decoded.property !== 'string' ||
      !('direction' in decoded) ||
      (decoded.direction !== 'asc' && decoded.direction !== 'desc') ||
      !('value' in decoded) ||
      !('id' in decoded) ||
      typeof decoded.id !== 'string' ||
      !decoded.id ||
      (typeof decoded.value !== 'string' &&
        (typeof decoded.value !== 'number' || !Number.isFinite(decoded.value)))
    ) {
      throw new CursorInvalidException();
    }

    return decoded as CursorPayload;
  }
}
