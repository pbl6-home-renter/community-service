import {
  Body,
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
} from '@nestjs/swagger';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { PaginatedResponseDto } from 'shared/presentation/pagination/paginated.response.dto';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import { ApiPaginatedSuccessResponse } from 'shared/presentation/decorators/api-paginated-success-response.decorator';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationResponseCodeConstant } from '../constants/conversation-response-code.constant';
import { ConversationCreateCommand } from '../../../application/commands/conversation-create/conversation-create.command';
import { ConversationCreateResult } from '../../../application/commands/conversation-create/conversation-create.result';
import { ConversationGetDetailQuery } from '../../../application/queries/conversation-get-detail/conversation-get-detail.query';
import { ConversationDetailQueryResult } from '../../../application/ports/conversation-detail-query.port';
import { ConversationListQuery } from '../../../application/queries/conversation-list/conversation-list.query';
import { ConversationListReadModel } from '../../../application/ports/conversation-page-query.port';
import { ConversationListRequestDto } from '../requests/conversation-list.request.dto';
import { ConversationMemberResponseDto } from '../responses/conversation-member.response.dto';
import { ConversationCreateRequestDto } from '../requests/conversation-create.request.dto';
import { ConversationCreateResponseDto } from '../responses/conversation-create.response.dto';
import { ConversationDetailResponseDto } from '../responses/conversation-detail.response.dto';
import { ConversationListResponseDto } from '../responses/conversation-list.response.dto';
import { ConversationLastMessageResponseDto } from '../responses/conversation-last-message.response.dto';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ResponseCode(ConversationResponseCodeConstant.CONVERSATIONS_FETCHED)
  @ApiOperation({
    operationId: 'getConversations',
    summary: 'Liệt kê hội thoại của người gọi',
  })
  @ApiPaginatedSuccessResponse({
    code: ConversationResponseCodeConstant.CONVERSATIONS_FETCHED,
    dataDto: ConversationListResponseDto,
    extraModels: [ConversationLastMessageResponseDto],
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'INVALID_QUERY' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'FORBIDDEN' })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'VALIDATION_FAILED',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Auth service unavailable',
  })
  async list(
    @Query() request: ConversationListRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<ConversationListResponseDto>> {
    const result = await this.queryBus.execute<
      ConversationListQuery,
      PaginatedResult<ConversationListReadModel>
    >(ConversationListRequestDto.toQuery(request, user.id));
    return PaginatedResponseDto.create({
      data: result.data.map(ConversationListResponseDto.fromReadModel),
      pagination: result.pagination,
    });
  }

  @Get(':conversationId')
  @HttpCode(HttpStatus.OK)
  @ResponseCode(ConversationResponseCodeConstant.CONVERSATION_FETCHED)
  @ApiOperation({
    operationId: 'getConversationsConversationid',
    summary: 'Xem chi tiết hội thoại',
  })
  @ApiSuccessResponse({
    code: ConversationResponseCodeConstant.CONVERSATION_FETCHED,
    dataDto: ConversationDetailResponseDto,
  })
  @ApiExtraModels(ConversationMemberResponseDto)
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'FORBIDDEN' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'NOT_FOUND' })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Auth service unavailable',
  })
  async getDetail(
    @Param('conversationId', ParseUUIDPipe) conversationId: Uuid,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ConversationDetailResponseDto> {
    const result = await this.queryBus.execute<
      ConversationGetDetailQuery,
      ConversationDetailQueryResult
    >(new ConversationGetDetailQuery(conversationId, user.id));
    return ConversationDetailResponseDto.fromResult(result);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    operationId: 'createConversation',
    summary: 'Tạo chat trực tiếp hoặc nhóm',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: ConversationCreateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'INVALID_REQUEST_BODY',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Identity service unavailable; no conversation was created.',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'VALIDATION_FAILED or UNEXPECTED_FIELD',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'INTERNAL_SERVER_ERROR',
  })
  async create(
    @Body() request: ConversationCreateRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ConversationCreateResponseDto> {
    const result = await this.commandBus.execute<
      ConversationCreateCommand,
      ConversationCreateResult
    >(ConversationCreateRequestDto.toCommand(request, user.id));
    return ConversationCreateResponseDto.fromResult(result);
  }
}
