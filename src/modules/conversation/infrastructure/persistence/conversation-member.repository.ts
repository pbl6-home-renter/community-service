import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { ConversationMemberEntity } from '../../domain/entities/conversation-member.entity';
import { ConversationMemberIdentity } from '../../domain/entities/conversation-member.props';
import { ConversationMemberRepository } from '../../domain/repositories/conversation-member.repository';
import { ConversationParticipantType } from '../../domain/enums/conversation-participant-type.enum';
import { ConversationMemberMapper } from './mappers/conversation-member.mapper';
import { ConversationMemberTypeormEntity } from './conversation-member.typeorm-entity';

@Injectable()
export class TypeOrmConversationMemberRepository implements ConversationMemberRepository {
  constructor(
    @InjectRepository(ConversationMemberTypeormEntity)
    private readonly repository: Repository<ConversationMemberTypeormEntity>,
  ) {}

  async save(
    member: ConversationMemberEntity,
    context?: TransactionContext,
  ): Promise<void> {
    await withTransaction(this.repository, context).save(
      ConversationMemberMapper.toPersistence(member),
    );
  }

  async findById(id: Uuid): Promise<ConversationMemberEntity | null> {
    const raw = await this.repository.findOne({
      where: { id, isDeleted: false },
    });
    return raw ? ConversationMemberMapper.toDomain(raw) : null;
  }

  async findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<ConversationMemberEntity | null> {
    const raw = await withTransaction(this.repository, context).findOne({
      where: { id, isDeleted: false },
      lock: { mode: 'pessimistic_write' },
    });
    return raw ? ConversationMemberMapper.toDomain(raw) : null;
  }

  async findByParticipantForUpdate(
    conversationId: Uuid,
    participant: ConversationMemberIdentity,
    context: TransactionContext,
  ): Promise<ConversationMemberEntity | null> {
    const where =
      participant.participantType === ConversationParticipantType.USER
        ? {
            conversationId,
            participantType: participant.participantType,
            userId: participant.userId,
            isDeleted: false,
          }
        : {
            conversationId,
            participantType: participant.participantType,
            systemParticipantKey: participant.systemParticipantKey,
            isDeleted: false,
          };
    const raw = await withTransaction(this.repository, context).findOne({
      where,
      lock: { mode: 'pessimistic_write' },
    });
    return raw ? ConversationMemberMapper.toDomain(raw) : null;
  }

  async delete(id: Uuid, context?: TransactionContext): Promise<void> {
    await withTransaction(this.repository, context).update(id, {
      isDeleted: true,
    });
  }
}
