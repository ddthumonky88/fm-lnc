import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller(['health', 'api/health'])
export class HealthController {
  @ApiOperation({ summary: 'Kiểm tra trạng thái server' })
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
