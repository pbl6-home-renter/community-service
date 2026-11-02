import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { ConversationEntity } from '../../domain/entities/conversation.entity';
import { ConversationRepository } from '../../domain/repositories/conversation.repository';
import { ConversationMapper } from './mappers/conversation.mapper';
import { ConversationTypeormEntity } from './conversation.typeorm-entity';

@Injectable()
export class TypeOrmConversationRepository implements ConversationRepository {
  constructor(
    @InjectRepository(ConversationTypeormEntity)
    private readonly repository: Repository<ConversationTypeormEntity>,
  ) {}

  async save(
    conversation: ConversationEntity,
    context?: TransactionContext,
  ): Promise<void> {
    await withTransaction(this.repository, context).save(
      ConversationMapper.toPersistence(conversation),
    );
  }

  async findById(id: Uuid): Promise<ConversationEntity | null> {
    const raw = await this.repository.findOne({
      where: { id, isDeleted: false },
    });
    return raw ? ConversationMapper.toDomain(raw) : null;
  }

  async delete(id: Uuid, context?: TransactionContext): Promise<void> {
    await withTransaction(this.repository, context).update(id, {
      isDeleted: true,
    });
  }
}
