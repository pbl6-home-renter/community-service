import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { TypeOrmTransactionContext } from './typeorm-transaction-context';

@Injectable()
export class TypeOrmUnitOfWork implements IUnitOfWork {
  constructor(private readonly dataSource: DataSource) {}

  run<T>(work: (context: TypeOrmTransactionContext) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) =>
      work(new TypeOrmTransactionContext(manager)),
    );
  }
}
