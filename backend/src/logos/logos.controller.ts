import { Controller, Get, Param, Query, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { LogosService } from './logos.service';

@Controller('api/logos')
export class LogosController {
  constructor(private readonly logosService: LogosService) {}

  @Get('confederation/:id')
  getConfederationLogo(@Param('id') id: string, @Res() res: Response) {
    const filePath = this.logosService.getConfederationLogoPath(id);
    if (!filePath) {
      throw new NotFoundException(`Logo for confederation ${id} not found`);
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    return res.sendFile(filePath);
  }

  @Get('nation/:id')
  getNationLogo(
    @Param('id') id: string,
    @Query('code') code: string,
    @Res() res: Response,
  ) {
    const filePath = this.logosService.getNationLogoPath(id, code);
    if (!filePath) {
      throw new NotFoundException(`Logo for nation ${id} (${code || ''}) not found`);
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    return res.sendFile(filePath);
  }
}
