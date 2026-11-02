import { BaseRepository } from 'shared/domain/repositories/base.repository';
import { ConversationEntity } from '../entities/conversation.entity';

export interface ConversationRepository extends BaseRepository<ConversationEntity> {}
