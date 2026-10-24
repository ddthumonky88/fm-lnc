import { Module } from '@nestjs/common';
import { ConfigService } from './config.service';
import { ConfigController } from './config.controller';
import { LogosModule } from '../logos/logos.module';
import { LncModule } from '../lnc/lnc.module';

@Module({
  imports: [LogosModule, LncModule],
  controllers: [ConfigController],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
