import {
  Body,
  Controller,
  Delete,
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
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { PushDeviceResponseCodeConstant } from '../constants/push-device-response-code.constant';
import { PushDeviceRegisterCommand } from '../../../application/commands/push-device-register.command';
import { PushDeviceRevokeCommand } from '../../../application/commands/push-device-revoke.command';
import { PushDeviceEntity } from '../../../domain/entities/push-device.entity';
import { PushDeviceRegisterRequestDto } from '../requests/push-device-register.request.dto';
import { PushDeviceRegisterResponseDto } from '../responses/push-device-register.response.dto';

@ApiTags('Notification')
@ApiBearerAuth()
@Controller('me/push-devices')
export class PushDeviceController {
  constructor(private readonly commands: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ResponseCode(PushDeviceResponseCodeConstant.PUSH_DEVICE_REGISTERED)
  @ApiOperation({
    operationId: 'postMePushDevices',
    summary: 'Register or refresh Android push device',
  })
  @ApiSuccessResponse({
    code: PushDeviceResponseCodeConstant.PUSH_DEVICE_REGISTERED,
    dataDto: PushDeviceRegisterResponseDto,
  })
  async register(
    @Body() request: PushDeviceRegisterRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PushDeviceRegisterResponseDto> {
    const device = await this.commands.execute<
      PushDeviceRegisterCommand,
      PushDeviceEntity
    >(new PushDeviceRegisterCommand(user.id, request.token));
    return { id: device.id, platform: device.platform };
  }

  @Delete(':deviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: 'deleteMePushDevicesDeviceid',
    summary: 'Unregister push device',
  })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'No content' })
  async revoke(
    @Param('deviceId', ParseUUIDPipe) deviceId: Uuid,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.commands.execute<PushDeviceRevokeCommand, void>(
      new PushDeviceRevokeCommand(user.id, deviceId),
    );
  }
}
