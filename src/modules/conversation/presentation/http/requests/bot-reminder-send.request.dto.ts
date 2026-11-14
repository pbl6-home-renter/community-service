import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { BotReminderSendCommand } from '../../../application/commands/bot-reminder-send/bot-reminder-send.command';
import { ReminderTemplate } from '../../../application/ports/bot-reminder-resource.port';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';

export class BotReminderSendRequestDto {
  @ApiProperty({ enum: ['invoice', 'contract_expiring'] })
  @IsIn(['invoice', 'contract_expiring'])
  templateType: ReminderTemplate;

  @ApiProperty({ format: 'uuid' })
  @IsUuid()
  resourceId: Uuid;

  @ApiProperty({ format: 'uuid' })
  @IsUuid()
  clientMessageId: Uuid;

  static toCommand(
    request: BotReminderSendRequestDto,
    conversationId: Uuid,
    userId: Uuid,
    token: string,
  ): BotReminderSendCommand {
    return new BotReminderSendCommand(
      conversationId,
      userId,
      token,
      request.templateType,
      request.resourceId,
      request.clientMessageId,
    );
  }
}
