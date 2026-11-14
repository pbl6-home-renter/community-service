import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export type ReminderTemplate = 'invoice' | 'contract_expiring';

export interface BotReminderResourcePort {
  render(
    template: ReminderTemplate,
    resourceId: Uuid,
    contractId: Uuid,
    token: string,
  ): Promise<string>;
}
