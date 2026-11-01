import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { SampleEntity } from '../../../domain/entities/sample.entity';
import { SampleCreateCommand } from '../../../application/commands/sample-create/sample-create.command';
import { SampleDeleteCommand } from '../../../application/commands/sample-delete/sample-delete.command';
import { SampleGetByIdQuery } from '../../../application/queries/sample-get-by-id/sample-get-by-id.query';
import { SampleResponseCodeConstant } from '../constants/sample-response-code.constant';
import { SampleCreateRequestDto } from '../requests/sample-create.request.dto';
import { SampleResponseDto } from '../responses/sample.response.dto';
import {
  Public,
  Roles,
} from 'shared/presentation/decorators/auth/access-control.decorators';
import { UserRole } from 'shared/domain/enums/user-role.enum';

@ApiTags('Samples')
@ApiBearerAuth()
@Controller('samples')
export class SampleController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  // Every route requires a valid access token by default (global JwtAuthGuard).
  @Post()
  @Roles(UserRole.LANDLORD, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ResponseCode(SampleResponseCodeConstant.SAMPLE_CREATED)
  @ApiOperation({
    operationId: 'createSample',
    summary: 'Create a new sample',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'INVALID_JSON, INVALID_REQUEST_BODY or BAD_REQUEST',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'VALIDATION_FAILED or UNEXPECTED_FIELD',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'INTERNAL_SERVER_ERROR',
  })
  @ApiSuccessResponse({
    status: HttpStatus.CREATED,
    code: SampleResponseCodeConstant.SAMPLE_CREATED,
    dataDto: SampleResponseDto,
  })
  async create(
    @Body() request: SampleCreateRequestDto,
  ): Promise<SampleResponseDto> {
    const sample = await this.commandBus.execute<
      SampleCreateCommand,
      SampleEntity
    >(SampleCreateRequestDto.toCommand(request));
    return SampleResponseDto.fromDomain(sample);
  }

  @Get(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ResponseCode(SampleResponseCodeConstant.SAMPLE_FETCHED)
  @ApiOperation({
    operationId: 'getSampleById',
    summary: 'Get sample by ID',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'NOT_FOUND' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'INTERNAL_SERVER_ERROR',
  })
  @ApiSuccessResponse({
    code: SampleResponseCodeConstant.SAMPLE_FETCHED,
    dataDto: SampleResponseDto,
  })
  async getById(
    @Param('id', ParseUUIDPipe) id: Uuid,
  ): Promise<SampleResponseDto> {
    const sample: SampleEntity = await this.queryBus.execute(
      new SampleGetByIdQuery(id),
    );
    return SampleResponseDto.fromDomain(sample);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ResponseCode(SampleResponseCodeConstant.SAMPLE_DELETED)
  @ApiOperation({
    operationId: 'deleteSample',
    summary: 'Soft-delete a sample',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'NOT_FOUND' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'INTERNAL_SERVER_ERROR',
  })
  @ApiSuccessResponse({
    status: HttpStatus.NO_CONTENT,
    code: SampleResponseCodeConstant.SAMPLE_DELETED,
  })
  async delete(@Param('id', ParseUUIDPipe) id: Uuid): Promise<void> {
    await this.commandBus.execute(new SampleDeleteCommand(id));
  }
}
