import { Inject, Injectable } from '@nestjs/common';
import { INTERNAL_HTTP_DI_TOKEN } from 'shared/application/di-tokens';
import { PeerService } from 'shared/application/http/peer-service.enum';
import { IInternalHttpClient } from 'shared/application/ports/internal-http-client.port';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
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
  ): Promise<string> {
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
      const [year, month, day] = contract.endDate.split('-');
      return `Thông báo: Ngày kết thúc hợp đồng thuê là ${day}/${month}/${year}. Vui lòng liên hệ chủ nhà để trao đổi.`;
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
    const [year, month] = invoice.period.split('-');
    const [whole, fraction] = invoice.totalAmount.split('.');
    const amount =
      whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.') +
      (fraction && /[1-9]/.test(fraction) ? `,${fraction}` : '');
    return `Thông báo: Hóa đơn ${invoice.code} kỳ ${month}/${year} có tổng tiền ${amount} đồng. Vui lòng xem chi tiết hóa đơn.`;
  }
}
