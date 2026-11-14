export const BOT_REMINDER_MESSAGE_CODE = {
  INVOICE_ISSUED: 'BOT_REMINDER_INVOICE_ISSUED',
  CONTRACT_END_DATE: 'BOT_REMINDER_CONTRACT_END_DATE',
} as const;

export const BOT_REMINDER_FALLBACK_TEXT = 'New reminder';

export type BotReminderContent =
  | {
      messageCode: typeof BOT_REMINDER_MESSAGE_CODE.INVOICE_ISSUED;
      parameters: { invoiceCode: string; period: string; totalAmount: string };
    }
  | {
      messageCode: typeof BOT_REMINDER_MESSAGE_CODE.CONTRACT_END_DATE;
      parameters: { endDate: string };
    };
