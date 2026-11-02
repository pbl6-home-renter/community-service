import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
import { CursorPaginatedResult } from 'shared/application/pagination/cursor-paginated-result';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { CursorPaginatedResponseDto } from 'shared/presentation/pagination/cursor-paginated.response.dto';
import { NotificationMarkReadCommand } from '../../../application/commands/notification-mark-read.command';
import { NotificationsMarkAllReadCommand } from '../../../application/commands/notifications-mark-all-read.command';
import { NotificationListQuery } from '../../../application/queries/notification-list.query';
import { NotificationEntity } from '../../../domain/entities/notification.entity';
import { NotificationListRequestDto } from '../requests/notification-list.request.dto';
import { NotificationListResponseDto } from '../responses/notification-list.response.dto';
import { NotificationMarkReadResponseDto } from '../responses/notification-mark-read.response.dto';
import { NotificationMarkAllReadResponseDto } from '../responses/notification-mark-all-read.response.dto';

@ApiTags('Notification')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @ResponseCode('NOTIFICATIONS_FETCHED')
  @ApiOperation({
    operationId: 'getNotifications',
    summary: 'List notifications',
  })
  @ApiExtraModels(NotificationListResponseDto)
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      type: 'object',
      required: ['statusCode', 'code', 'data', 'pagination'],
      properties: {
        statusCode: { type: 'integer', enum: [200] },
        code: { type: 'string', enum: ['NOTIFICATIONS_FETCHED'] },
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(NotificationListResponseDto) },
        },
        pagination: {
          type: 'object',
          required: ['type', 'pageSize', 'nextCursor', 'hasNextPage'],
          properties: {
            type: { type: 'string', enum: ['cursor'] },
            pageSize: { type: 'integer' },
            nextCursor: { type: 'string', nullable: true },
            hasNextPage: { type: 'boolean' },
          },
        },
      },
    },
  })
  async list(
    @Query() request: NotificationListRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CursorPaginatedResponseDto<NotificationListResponseDto>> {
    const result = await this.queries.execute<
      NotificationListQuery,
      CursorPaginatedResult<NotificationEntity>
    >(
      new NotificationListQuery(
        user.id,
        request.cursor,
        request.pageSize,
        request.filter?.unreadOnly ??
          (request['filter[unreadOnly]'] === undefined
            ? undefined
            : request['filter[unreadOnly]'] === 'true'),
      ),
    );
    return CursorPaginatedResponseDto.create({
      ...result,
      data: result.data.map(NotificationListResponseDto.fromDomain),
    });
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ResponseCode('NOTIFICATIONS_ALL_MARKED_READ')
  @ApiOperation({
    operationId: 'postNotificationsMarkAllRead',
    summary: 'Mark all notifications as read',
  })
  @ApiSuccessResponse({
    code: 'NOTIFICATIONS_ALL_MARKED_READ',
    dataDto: NotificationMarkAllReadResponseDto,
  })
  async markAllRead(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationMarkAllReadResponseDto> {
    return {
      markedCount: await this.commands.execute<
        NotificationsMarkAllReadCommand,
        number
      >(new NotificationsMarkAllReadCommand(user.id)),
    };
  }

  @Post(':notificationId/mark-read')
  @HttpCode(HttpStatus.OK)
  @ResponseCode('NOTIFICATION_MARKED_READ')
  @ApiOperation({
    operationId: 'postNotificationsNotificationidMarkRead',
    summary: 'Mark notification as read',
  })
  @ApiSuccessResponse({
    code: 'NOTIFICATION_MARKED_READ',
    dataDto: NotificationMarkReadResponseDto,
  })
  async markRead(
    @Param('notificationId', ParseUUIDPipe) notificationId: Uuid,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationMarkReadResponseDto> {
    const entity = await this.commands.execute<
      NotificationMarkReadCommand,
      NotificationEntity
    >(new NotificationMarkReadCommand(user.id, notificationId));
    return { id: entity.id, readAt: entity.readAt! };
  }
}
