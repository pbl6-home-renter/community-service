import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import { Public } from 'shared/presentation/decorators/auth/access-control.decorators';
import { ServiceConstants } from 'config/service.constants';

@ApiTags('Health')
@Public()
@Controller(`${ServiceConstants.PATH}/health`)
export class HealthController {
  @Get()
  @HttpCode(HttpStatus.OK)
  @ResponseCode('HEALTH_CHECK_PASSED')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiSuccessResponse({
    code: 'HEALTH_CHECK_PASSED',
    description: 'Service is healthy',
  })
  async check(): Promise<void> {
    return;
  }
}
