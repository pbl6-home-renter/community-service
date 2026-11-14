import { Inject, Injectable } from '@nestjs/common';
import { INTERNAL_HTTP_DI_TOKEN } from 'shared/application/di-tokens';
import { PeerService } from 'shared/application/http/peer-service.enum';
import { IInternalHttpClient } from 'shared/application/ports/internal-http-client.port';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  BOT_REMINDER_MESSAGE_CODE,
  BotReminderContent,
} from 'modules/message/domain/constants/bot-reminder-message-code.constant';
import {
  BotReminderResourcePort,
  ReminderTemplate,
} from '../../application/ports/bot-reminder-resource.port';

interface ContractSnapshot {
  id: Uuid;
  status: string;
  endDate: string;
}
interface InvoiceSnapshot {
  id: Uuid;
  contractId: Uuid;
  invoiceStatus: string;
  code: string;
  period: string;
  totalAmount: string;
}

@Injectable()
export class TenancyBotReminderResourceService implements BotReminderResourcePort {
  constructor(
    @Inject(INTERNAL_HTTP_DI_TOKEN.CLIENT)
    private readonly client: IInternalHttpClient,
  ) {}

  async render(
    template: ReminderTemplate,
    resourceId: Uuid,
    contractId: Uuid,
    token: string,
  ): Promise<BotReminderContent> {
    if (template === 'contract_expiring') {
      if (resourceId.toLowerCase() !== contractId.toLowerCase())
        throw new ValidationException('Resource does not match conversation');
      const contract = await this.client.get<ContractSnapshot>(
        PeerService.TENANCY,
        `/api/v1/contracts/${resourceId}`,
        { bearerToken: token },
      );
      if (
        contract.id.toLowerCase() !== contractId.toLowerCase() ||
        contract.status !== 'active' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(contract.endDate)
      ) {
        throw new ValidationException('Contract is not eligible for reminder');
      }
      return {
        messageCode: BOT_REMINDER_MESSAGE_CODE.CONTRACT_END_DATE,
        parameters: { endDate: contract.endDate },
      };
    }
    const invoice = await this.client.get<InvoiceSnapshot>(
      PeerService.TENANCY,
      `/api/v1/invoices/${resourceId}`,
      { bearerToken: token },
    );
    if (
      invoice.id.toLowerCase() !== resourceId.toLowerCase() ||
      invoice.contractId.toLowerCase() !== contractId.toLowerCase() ||
      invoice.invoiceStatus !== 'issued' ||
      !/^\d{4}-\d{2}$/.test(invoice.period) ||
      !/^\d+(?:\.\d+)?$/.test(invoice.totalAmount) ||
      typeof invoice.code !== 'string' ||
      !invoice.code.trim() ||
      invoice.code.length > 100
    ) {
      throw new ValidationException('Invoice is not eligible for reminder');
    }
    return {
      messageCode: BOT_REMINDER_MESSAGE_CODE.INVOICE_ISSUED,
      parameters: {
        invoiceCode: invoice.code,
        period: invoice.period,
        totalAmount: invoice.totalAmount,
      },
    };
  }
}
