import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { RawResponse } from './common/raw-response.decorator';

@ApiTags('Health')
@RawResponse()
@Controller(['health', 'api/health'])
export class HealthController {
  @ApiOperation({ summary: 'Kiểm tra trạng thái server' })
  @ApiOkResponse({
    description: 'Trạng thái hoạt động của máy chủ',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2026-10-24T15:00:00.000Z' },
      },
      example: {
        status: 'ok',
        timestamp: '2026-10-24T15:00:00.000Z',
      },
    },
  })
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}

