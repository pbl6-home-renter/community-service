import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { BotReminderContent } from 'modules/message/domain/constants/bot-reminder-message-code.constant';

export type ReminderTemplate = 'invoice' | 'contract_expiring';

export interface BotReminderResourcePort {
  render(
    template: ReminderTemplate,
    resourceId: Uuid,
    contractId: Uuid,
    token: string,
  ): Promise<BotReminderContent>;
}
