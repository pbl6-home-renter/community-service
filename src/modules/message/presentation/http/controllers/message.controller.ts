import { UserAvatarLookupQuery } from 'modules/conversation/application/queries/user-avatar-lookup/user-avatar-lookup.query';
import { UserAvatarUrls } from 'modules/conversation/application/queries/user-avatar-lookup/user-avatar-lookup.query.handler';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
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
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { CursorPaginatedResult } from 'shared/application/pagination/cursor-paginated-result';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { CursorPaginatedResponseDto } from 'shared/presentation/pagination/cursor-paginated.response.dto';
import { MessageSendCommand } from '../../../application/commands/message-send/message-send.command';
import { MessageMarkReadCommand } from '../../../application/commands/message-mark-read/message-mark-read.command';
import { MessageMarkReadResult } from '../../../application/commands/message-mark-read/message-mark-read.result';
import { MessageListQuery } from '../../../application/queries/message-list/message-list.query';
import { MessageReadModel } from '../../../application/ports/message-page-query.port';
import { MessageResponseCodeConstant } from '../constants/message-response-code.constant';
import { MessageListRequestDto } from '../requests/message-list.request.dto';
import { MessageSendRequestDto } from '../requests/message-send.request.dto';
import { MessageMarkReadRequestDto } from '../requests/message-mark-read.request.dto';
import { MessageListResponseDto } from '../responses/message-list.response.dto';
import { MessageSendResponseDto } from '../responses/message-send.response.dto';
import { MessageMarkReadResponseDto } from '../responses/message-mark-read.response.dto';
import { MessageSendResult } from '../../../application/commands/message-send/message-send.result';
import { MessageSearchQuery } from '../../../application/queries/message-search/message-search.query';
import { MessageSearchReadModel } from '../../../application/ports/message-page-query.port';
import { MessageSearchRequestDto } from '../requests/message-search.request.dto';
import { MessageSearchResponseDto } from '../responses/message-search.response.dto';
import { Response } from 'express';

const CURSOR_PAGINATION_SCHEMA: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['type', 'pageSize', 'nextCursor', 'hasNextPage'],
  properties: {
    type: { type: 'string', enum: ['cursor'] },
    pageSize: { type: 'integer', minimum: 1, maximum: 100 },
    nextCursor: { type: 'string', nullable: true },
    hasNextPage: { type: 'boolean' },
  },
};

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('messages')
export class MessageController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ResponseCode(MessageResponseCodeConstant.MESSAGES_FETCHED)
  @ApiOperation({
    operationId: 'getMessages',
    summary: 'Liệt kê tin nhắn trong hội thoại',
  })
  @ApiExtraModels(MessageListResponseDto)
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['statusCode', 'code', 'data', 'pagination'],
      properties: {
        statusCode: { type: 'integer', enum: [HttpStatus.OK] },
        code: {
          type: 'string',
          enum: [MessageResponseCodeConstant.MESSAGES_FETCHED],
        },
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(MessageListResponseDto) },
        },
        pagination: CURSOR_PAGINATION_SCHEMA,
      },
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'INVALID_QUERY' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'FORBIDDEN' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'CONVERSATION_NOT_FOUND',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'INVALID_CURSOR or VALIDATION_FAILED',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'AUTH_UNAVAILABLE',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'TOO_MANY_REQUESTS',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'INTERNAL_SERVER_ERROR',
  })
  async list(
    @Query() request: MessageListRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CursorPaginatedResponseDto<MessageListResponseDto>> {
    const result = await this.queryBus.execute<
      MessageListQuery,
      CursorPaginatedResult<MessageReadModel>
    >(MessageListRequestDto.toQuery(request, user.id));
    const avatars = await this.queryBus.execute<
      UserAvatarLookupQuery,
      UserAvatarUrls
    >(
      new UserAvatarLookupQuery(
        result.data.map((message) => message.senderUserId),
      ),
    );
    return CursorPaginatedResponseDto.create({
      ...result,
      data: result.data.map((message) =>
        MessageListResponseDto.fromReadModel(message, avatars),
      ),
    });
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ResponseCode(MessageResponseCodeConstant.MESSAGES_SEARCHED)
  @ApiOperation({
    operationId: 'getMessagesSearch',
    summary: 'Tìm tin nhắn theo nội dung trong một hội thoại',
  })
  @ApiExtraModels(MessageSearchResponseDto)
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['statusCode', 'code', 'data', 'pagination'],
      properties: {
        statusCode: { type: 'integer', enum: [HttpStatus.OK] },
        code: {
          type: 'string',
          enum: [MessageResponseCodeConstant.MESSAGES_SEARCHED],
        },
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(MessageSearchResponseDto) },
        },
        pagination: CURSOR_PAGINATION_SCHEMA,
      },
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'INVALID_QUERY' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'FORBIDDEN' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'CONVERSATION_NOT_FOUND',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'INVALID_CURSOR or VALIDATION_FAILED',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'AUTH_UNAVAILABLE',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'TOO_MANY_REQUESTS',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'INTERNAL_SERVER_ERROR',
  })
  async search(
    @Query() request: MessageSearchRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CursorPaginatedResponseDto<MessageSearchResponseDto>> {
    const result = await this.queryBus.execute<
      MessageSearchQuery,
      CursorPaginatedResult<MessageSearchReadModel>
    >(MessageSearchRequestDto.toQuery(request, user.id));
    return CursorPaginatedResponseDto.create({
      ...result,
      data: result.data.map(MessageSearchResponseDto.fromReadModel),
    });
  }

  @Post('mark-read')
  @HttpCode(HttpStatus.OK)
  @ResponseCode(MessageResponseCodeConstant.MESSAGES_MARKED_READ)
  @ApiOperation({
    operationId: 'postMessagesMarkRead',
    summary: 'Đánh dấu hội thoại đã đọc',
  })
  @ApiSuccessResponse({
    code: MessageResponseCodeConstant.MESSAGES_MARKED_READ,
    dataDto: MessageMarkReadResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'INVALID_REQUEST_BODY',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'FORBIDDEN' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'CONVERSATION_NOT_FOUND',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'READ_CURSOR_INVALID or VALIDATION_FAILED',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'AUTH_UNAVAILABLE',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'TOO_MANY_REQUESTS',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'INTERNAL_SERVER_ERROR',
  })
  async markRead(
    @Body() request: MessageMarkReadRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MessageMarkReadResponseDto> {
    const result = await this.commandBus.execute<
      MessageMarkReadCommand,
      MessageMarkReadResult
    >(MessageMarkReadRequestDto.toCommand(request, user.id));
    return MessageMarkReadResponseDto.fromResult(result);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseCode(MessageResponseCodeConstant.MESSAGE_SENT)
  @ApiOperation({
    operationId: 'postMessages',
    summary: 'Gửi tin nhắn',
  })
  @ApiSuccessResponse({
    status: HttpStatus.CREATED,
    code: MessageResponseCodeConstant.MESSAGE_SENT,
    dataDto: MessageSendResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'INVALID_REQUEST_BODY',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'FORBIDDEN' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'CONVERSATION_NOT_FOUND',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description:
      'MESSAGE_CONTENT_INVALID, MESSAGE_REPLY_TARGET_INVALID or VALIDATION_FAILED',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'SERVICE_UNAVAILABLE',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'TOO_MANY_REQUESTS',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'INTERNAL_SERVER_ERROR',
  })
  async send(
    @Body() request: MessageSendRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MessageSendResponseDto> {
    const result = await this.commandBus.execute<
      MessageSendCommand,
      MessageSendResult
    >(MessageSendRequestDto.toCommand(request, user.id));
    response.setHeader('Location', '/api/v1/messages');
    return MessageSendResponseDto.fromResult(result);
  }
}
