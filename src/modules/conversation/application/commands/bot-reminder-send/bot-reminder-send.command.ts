import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ReminderTemplate } from '../../ports/bot-reminder-resource.port';

export class BotReminderSendCommand {
  constructor(
    readonly conversationId: Uuid,
    readonly userId: Uuid,
    readonly token: string,
    readonly templateType: ReminderTemplate,
    readonly resourceId: Uuid,
    readonly clientMessageId: Uuid,
  ) {}
}
