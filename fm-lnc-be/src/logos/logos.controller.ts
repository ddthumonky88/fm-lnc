import { Controller, Get, Param, Query, Res, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { LogosService } from './logos.service';

@ApiTags('Logos')
@Controller('api/logos')
export class LogosController {
  constructor(private readonly logosService: LogosService) {}

  @ApiOperation({ summary: 'Lấy logo Confederation' })
  @ApiParam({ name: 'id', description: 'Confederation ID' })
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

  @ApiOperation({ summary: 'Lấy logo Nation' })
  @ApiParam({ name: 'id', description: 'Nation ID' })
  @ApiQuery({ name: 'code', required: false, description: 'Mã 3 chữ cái của quốc gia (nếu có)' })
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

  @ApiOperation({ summary: 'Lấy logo Competition' })
  @ApiParam({ name: 'id', description: 'Competition ID' })
  @Get('competition/:id')
  getCompetitionLogo(@Param('id') id: string, @Res() res: Response) {
    const filePath = this.logosService.getCompetitionLogoPath(id);
    if (!filePath) {
      throw new NotFoundException(`Logo for competition ${id} not found`);
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    return res.sendFile(filePath);
  }

  @ApiOperation({ summary: 'Lấy logo Club' })
  @ApiParam({ name: 'id', description: 'Club ID' })
  @Get('club/:id')
  getClubLogo(@Param('id') id: string, @Res() res: Response) {
    const filePath = this.logosService.getClubLogoPath(id);
    if (!filePath) {
      throw new NotFoundException(`Logo for club ${id} not found`);
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    return res.sendFile(filePath);
  }
}
