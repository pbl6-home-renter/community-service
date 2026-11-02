import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class MessageMarkReadCommand {
  constructor(
    readonly conversationId: Uuid,
    readonly actorUserId: Uuid,
    readonly lastReadSequence: string,
  ) {}
}
