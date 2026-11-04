import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Put,
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
import { ConversationMembersAddCommand } from '../../../application/commands/conversation-members-add/conversation-members-add.command';
import { ConversationMembersAddRequestDto } from '../requests/conversation-members-add.request.dto';
import { ConversationMemberEntity } from 'modules/conversation-member/domain/entities/conversation-member.entity';
import { ConversationMemberDepartureCommand } from '../../../application/commands/conversation-member-departure/conversation-member-departure.command';
import { ConversationMemberRoleUpdateRequestDto } from '../requests/conversation-member-role-update.request.dto';
import { ConversationMemberRoleUpdateCommand } from '../../../application/commands/conversation-member-role-update/conversation-member-role-update.command';
import { ConversationEntity } from '../../../domain/entities/conversation.entity';
import { ConversationMetadataUpdateCommand } from '../../../application/commands/conversation-metadata-update/conversation-metadata-update.command';
import { ConversationMetadataUpdateRequestDto } from '../requests/conversation-metadata-update.request.dto';
import { ConversationMetadataUpdateResponseDto } from '../responses/conversation-metadata-update.response.dto';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Patch(':conversationId')
  @HttpCode(HttpStatus.OK)
  @ResponseCode(ConversationResponseCodeConstant.CONVERSATION_UPDATED)
  @ApiOperation({
    operationId: 'updateConversation',
    summary: 'Sửa tên hoặc ảnh nhóm',
  })
  @ApiSuccessResponse({
    code: ConversationResponseCodeConstant.CONVERSATION_UPDATED,
    dataDto: ConversationMetadataUpdateResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'INVALID_PATH' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'FORBIDDEN' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'NOT_FOUND' })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'VALIDATION_FAILED or CONVERSATION_AVATAR_INVALID',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Identity service unavailable; conversation was not updated.',
  })
  async updateMetadata(
    @Param('conversationId', ParseUUIDPipe) conversationId: Uuid,
    @Body() request: ConversationMetadataUpdateRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ConversationMetadataUpdateResponseDto> {
    const conversation = await this.commandBus.execute<
      ConversationMetadataUpdateCommand,
      ConversationEntity
    >(
      ConversationMetadataUpdateRequestDto.toCommand(
        request,
        conversationId,
        user.id,
      ),
    );
    return ConversationMetadataUpdateResponseDto.fromDomain(conversation);
  }

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

  @Delete(':conversationId/members/me')
  @HttpCode(HttpStatus.OK)
  @ResponseCode(ConversationResponseCodeConstant.CONVERSATION_LEFT)
  @ApiOperation({
    operationId: 'leaveConversation',
    summary: 'Rời nhóm chat',
  })
  @ApiSuccessResponse({
    code: ConversationResponseCodeConstant.CONVERSATION_LEFT,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'FORBIDDEN' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'NOT_FOUND' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'GROUP_MUST_RETAIN_ACTIVE_MEMBER',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'VALIDATION_FAILED',
  })
  async leave(
    @Param('conversationId', ParseUUIDPipe) conversationId: Uuid,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.commandBus.execute<ConversationMemberDepartureCommand, void>(
      new ConversationMemberDepartureCommand(
        conversationId,
        user.id,
        user.id,
        'leave',
      ),
    );
  }

  @Delete(':conversationId/members/:userId')
  @HttpCode(HttpStatus.OK)
  @ResponseCode(ConversationResponseCodeConstant.CONVERSATION_MEMBER_REMOVED)
  @ApiOperation({
    operationId: 'removeConversationMember',
    summary: 'Kick thành viên khỏi nhóm',
  })
  @ApiSuccessResponse({
    code: ConversationResponseCodeConstant.CONVERSATION_MEMBER_REMOVED,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'INVALID_PATH' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'FORBIDDEN' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'NOT_FOUND' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'GROUP_MUST_RETAIN_ACTIVE_MEMBER',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'VALIDATION_FAILED',
  })
  async removeMember(
    @Param('conversationId', ParseUUIDPipe) conversationId: Uuid,
    @Param('userId', ParseUUIDPipe) userId: Uuid,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.commandBus.execute<ConversationMemberDepartureCommand, void>(
      new ConversationMemberDepartureCommand(
        conversationId,
        user.id,
        userId,
        'kick',
      ),
    );
  }

  @Put(':conversationId/members/:userId/role')
  @HttpCode(HttpStatus.OK)
  @ResponseCode(
    ConversationResponseCodeConstant.CONVERSATION_MEMBER_ROLE_UPDATED,
  )
  @ApiOperation({
    operationId: 'updateConversationMemberRole',
    summary: 'Đổi vai trò thành viên',
  })
  @ApiSuccessResponse({
    code: ConversationResponseCodeConstant.CONVERSATION_MEMBER_ROLE_UPDATED,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'INVALID_BODY' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'FORBIDDEN' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'NOT_FOUND' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'LAST_ADMIN_CANNOT_BE_DEMOTED',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'VALIDATION_FAILED',
  })
  async updateMemberRole(
    @Param('conversationId', ParseUUIDPipe) conversationId: Uuid,
    @Param('userId', ParseUUIDPipe) userId: Uuid,
    @Body() request: ConversationMemberRoleUpdateRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.commandBus.execute<ConversationMemberRoleUpdateCommand, void>(
      ConversationMemberRoleUpdateRequestDto.toCommand(
        request,
        conversationId,
        userId,
        user.id,
      ),
    );
  }

  @Get(':conversationId/members')
  @HttpCode(HttpStatus.OK)
  @ResponseCode(ConversationResponseCodeConstant.CONVERSATION_MEMBERS_FETCHED)
  @ApiOperation({
    operationId: 'listConversationMembers',
    summary: 'Xem thành viên hội thoại',
  })
  @ApiExtraModels(ConversationMemberResponseDto)
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['statusCode', 'code', 'data'],
      properties: {
        statusCode: { type: 'integer', enum: [HttpStatus.OK] },
        code: {
          type: 'string',
          enum: [ConversationResponseCodeConstant.CONVERSATION_MEMBERS_FETCHED],
        },
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(ConversationMemberResponseDto) },
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'FORBIDDEN' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'NOT_FOUND' })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Auth service unavailable',
  })
  async listMembers(
    @Param('conversationId', ParseUUIDPipe) conversationId: Uuid,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ConversationMemberResponseDto[]> {
    const result = await this.queryBus.execute<
      ConversationGetDetailQuery,
      ConversationDetailQueryResult
    >(new ConversationGetDetailQuery(conversationId, user.id));
    return result.members.map(ConversationMemberResponseDto.fromDomain);
  }

  @Post(':conversationId/members')
  @HttpCode(HttpStatus.OK)
  @ResponseCode(ConversationResponseCodeConstant.CONVERSATION_MEMBERS_ADDED)
  @ApiOperation({
    operationId: 'addConversationMembers',
    summary: 'Thêm thành viên nhóm',
  })
  @ApiExtraModels(ConversationMemberResponseDto)
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['statusCode', 'code', 'data'],
      properties: {
        statusCode: { type: 'integer', enum: [HttpStatus.OK] },
        code: {
          type: 'string',
          enum: [ConversationResponseCodeConstant.CONVERSATION_MEMBERS_ADDED],
        },
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(ConversationMemberResponseDto) },
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'INVALID_BODY' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'FORBIDDEN' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'NOT_FOUND' })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'VALIDATION_FAILED',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Identity service unavailable; no members were added.',
  })
  async addMembers(
    @Param('conversationId', ParseUUIDPipe) conversationId: Uuid,
    @Body() request: ConversationMembersAddRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ConversationMemberResponseDto[]> {
    const members = await this.commandBus.execute<
      ConversationMembersAddCommand,
      ConversationMemberEntity[]
    >(
      ConversationMembersAddRequestDto.toCommand(
        request,
        conversationId,
        user.id,
      ),
    );
    return members.map(ConversationMemberResponseDto.fromDomain);
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
    description:
      'GROUP_MEMBERS_INSUFFICIENT, VALIDATION_FAILED or UNEXPECTED_FIELD',
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
