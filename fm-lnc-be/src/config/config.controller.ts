import { Controller, Get, Put, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { ConfigService, AppPathsConfig } from './config.service';

@ApiTags('Config')
@Controller('api/config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @ApiOperation({ summary: 'Lấy cấu hình hiện tại và trạng thái kiểm tra các thư mục' })
  @Get()
  getConfig() {
    return this.configService.getConfig();
  }

  @ApiOperation({ summary: 'Cập nhật cấu hình thư mục LNC và ảnh' })
  @ApiBody({ schema: { type: 'object' } })
  @Put()
  updateConfig(@Body() body: Partial<AppPathsConfig>) {
    return this.configService.updateConfig(body);
  }

  @ApiOperation({ summary: 'Kiểm tra đường dẫn thư mục có tồn tại hay không' })
  @ApiBody({ schema: { type: 'object', properties: { path: { type: 'string' } } } })
  @Post('test')
  testPath(@Body('path') targetPath: string) {
    return this.configService.testPath(targetPath || '');
  }

  @ApiOperation({ summary: 'Kích hoạt đồng bộ LNC từ thư mục đã cấu hình' })
  @Post('sync')
  syncLnc() {
    return this.configService.syncLncNow();
  }

  @ApiOperation({ summary: 'Kích hoạt tải lại ảnh từ các thư mục đã cấu hình' })
  @Post('reload-logos')
  reloadLogos() {
    return this.configService.reloadLogosNow();
  }
}
