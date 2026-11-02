import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ConversationCreateCommand } from '../../../application/commands/conversation-create/conversation-create.command';
import { ConversationCreateResult } from '../../../application/commands/conversation-create/conversation-create.result';
import { ConversationCreateRequestDto } from '../requests/conversation-create.request.dto';
import { ConversationCreateResponseDto } from '../responses/conversation-create.response.dto';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationController {
  constructor(private readonly commandBus: CommandBus) {}

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
