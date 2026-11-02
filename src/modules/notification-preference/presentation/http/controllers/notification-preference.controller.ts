import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { NotificationPreferenceUpdateCommand } from '../../../application/commands/notification-preference-update.command';
import { NotificationPreferenceGetQuery } from '../../../application/queries/notification-preference-get.query';
import { NotificationPreferenceValue } from '../../../application/ports/notification-preference-value';
import { NotificationPreferenceUpdateRequestDto } from '../requests/notification-preference-update.request.dto';
import {
  NotificationPreferenceResponseDto,
  NotificationPreferenceUpdateResponseDto,
} from '../responses/notification-preference.response.dto';

@ApiTags('Notification')
@ApiBearerAuth()
@Controller('me/notification-preference')
export class NotificationPreferenceController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @ResponseCode('NOTIFICATION_PREFERENCES_FETCHED')
  @ApiOperation({
    operationId: 'getMeNotificationPreference',
    summary: 'Get notification preferences',
  })
  @ApiExtraModels(NotificationPreferenceResponseDto)
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      required: ['statusCode', 'code', 'data'],
      properties: {
        statusCode: { type: 'integer', enum: [200] },
        code: { type: 'string', enum: ['NOTIFICATION_PREFERENCES_FETCHED'] },
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(NotificationPreferenceResponseDto) },
        },
      },
    },
  })
  get(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationPreferenceResponseDto[]> {
    return this.queries.execute<
      NotificationPreferenceGetQuery,
      NotificationPreferenceValue[]
    >(new NotificationPreferenceGetQuery(user.id));
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ResponseCode('NOTIFICATION_PREFERENCES_UPDATED')
  @ApiOperation({
    operationId: 'putMeNotificationPreference',
    summary: 'Update notification preferences',
  })
  @ApiSuccessResponse({
    code: 'NOTIFICATION_PREFERENCES_UPDATED',
    dataDto: NotificationPreferenceUpdateResponseDto,
  })
  async update(
    @Body() request: NotificationPreferenceUpdateRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationPreferenceUpdateResponseDto> {
    const updatedAt = await this.commands.execute<
      NotificationPreferenceUpdateCommand,
      Date
    >(new NotificationPreferenceUpdateCommand(user.id, request.preferences));
    return { updatedAt };
  }
}
