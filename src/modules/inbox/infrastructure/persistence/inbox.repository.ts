import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InboxRepository } from '../../application/ports/inbox.repository';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { InboxTypeormEntity } from './inbox.typeorm-entity';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

@Injectable()
export class TypeOrmInboxRepository implements InboxRepository {
  constructor(
    @InjectRepository(InboxTypeormEntity)
    private readonly repository: Repository<InboxTypeormEntity>,
  ) {}

  async recordIfNew(
    messageId: Uuid,
    eventType: string,
    context: TransactionContext,
  ): Promise<boolean> {
    const repository = withTransaction(this.repository, context);

    const result = await repository
      .createQueryBuilder()
      .insert()
      .into(InboxTypeormEntity)
      .values({ messageId, eventType })
      .orIgnore()
      .returning(['id'])
      .execute();

    return result.raw.length > 0;
  }
}
