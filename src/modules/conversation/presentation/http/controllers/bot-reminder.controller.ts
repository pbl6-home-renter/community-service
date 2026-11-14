import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MessageSendResult } from 'modules/message/application/commands/message-send/message-send.result';
import { MessageSendResponseDto } from 'modules/message/presentation/http/responses/message-send.response.dto';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { BotReminderSendCommand } from '../../../application/commands/bot-reminder-send/bot-reminder-send.command';
import { BotReminderSendRequestDto } from '../requests/bot-reminder-send.request.dto';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('conversations')
export class BotReminderController {
  constructor(private readonly commands: CommandBus) {}

  @Post(':conversationId/bot-reminders')
  @Roles(UserRole.LANDLORD)
  @HttpCode(HttpStatus.CREATED)
  @ResponseCode('BOT_REMINDER_SENT')
  @ApiOperation({
    operationId: 'sendBotReminder',
    summary: 'Send a manual reminder to a contract conversation',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: MessageSendResponseDto })
  async send(
    @Param('conversationId', ParseUUIDPipe) conversationId: Uuid,
    @Body() body: BotReminderSendRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('authorization') authorization: string,
  ): Promise<MessageSendResponseDto> {
    const token = /^Bearer\s+(\S+)$/i.exec(authorization ?? '')?.[1];
    if (!token) throw new ValidationException('Bearer token is required');
    const result = await this.commands.execute<
      BotReminderSendCommand,
      MessageSendResult
    >(
      BotReminderSendRequestDto.toCommand(body, conversationId, user.id, token),
    );
    return MessageSendResponseDto.fromResult(result);
  }
}
