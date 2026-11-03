import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { EmailMessage } from '../../ports/email-sender.port';

export class EmailSendRequestedCommand implements ICommand {
  constructor(
    readonly emailRequestId: Uuid,
    readonly message: EmailMessage,
  ) {}
}
