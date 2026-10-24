import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { LogosService } from '../logos/logos.service';
import { LncParserService } from '../lnc/lnc-parser.service';

export interface AppPathsConfig {
  lncDir: string;
  confedLogoDir: string;
  nationLogoDir: string;
  compLogoDir: string;
  clubLogoDir: string;
}

export interface DirCheckStatus {
  path: string;
  exists: boolean;
  fileCount?: number;
}

export interface ConfigStatusResponse {
  config: AppPathsConfig;
  status: {
    lnc: {
      dir: string;
      exists: boolean;
      files: {
        cityNation: { name: string; exists: boolean; size?: number; mtime?: string };
        clubStadium: { name: string; exists: boolean; size?: number; mtime?: string };
        compOther: { name: string; exists: boolean; size?: number; mtime?: string };
      };
      allFilesFound: boolean;
    };
    confedLogo: DirCheckStatus;
    nationLogo: DirCheckStatus;
    compLogo: DirCheckStatus;
    clubLogo: DirCheckStatus;
  };
}

@Injectable()
export class ConfigService implements OnModuleInit {
  private readonly logger = new Logger(ConfigService.name);
  private readonly configFilePath = path.resolve(process.cwd(), 'app-config.json');

  private currentConfig: AppPathsConfig = {
    lncDir: '',
    confedLogoDir: 'D:\\Games\\Documents\\Sports Interactive\\Football Manager 2024\\graphics\\logo\\Confederations\\normal',
    nationLogoDir: 'D:\\Games\\Documents\\Sports Interactive\\Football Manager 2024\\graphics\\logo\\Nations\\normal',
    compLogoDir: 'D:\\Games\\Documents\\Sports Interactive\\Football Manager 2024\\graphics\\logo\\Competitions',
    clubLogoDir: 'D:\\Games\\Documents\\Sports Interactive\\Football Manager 2024\\graphics\\logo\\Club',
  };

  constructor(
    private readonly logosService: LogosService,
    private readonly lncParserService: LncParserService,
  ) {}

  onModuleInit() {
    this.loadConfig();
  }

  private loadConfig() {
    try {
      if (fs.existsSync(this.configFilePath)) {
        const content = fs.readFileSync(this.configFilePath, 'utf8');
        const parsed = JSON.parse(content);
        this.currentConfig = { ...this.currentConfig, ...parsed };
        this.logger.log(`Loaded custom app configuration from ${this.configFilePath}`);
      } else {
        // Fallback default LNC dir to parser auto-detected dir
        this.currentConfig.lncDir = this.lncParserService.getBaseDir();
        this.saveConfigToFile();
      }
    } catch (err: any) {
      this.logger.warn(`Failed reading app-config.json: ${err.message}. Using defaults.`);
    }

    // Apply to services
    if (this.currentConfig.lncDir) {
      this.lncParserService.setBaseDir(this.currentConfig.lncDir);
    }
    this.logosService.reloadConfig({
      confedDir: this.currentConfig.confedLogoDir,
      nationDir: this.currentConfig.nationLogoDir,
      compDir: this.currentConfig.compLogoDir,
      clubDir: this.currentConfig.clubLogoDir,
    });
  }

  private saveConfigToFile() {
    try {
      fs.writeFileSync(this.configFilePath, JSON.stringify(this.currentConfig, null, 2), 'utf8');
    } catch (err: any) {
      this.logger.error(`Failed to write ${this.configFilePath}: ${err.message}`);
    }
  }

  getConfig(): ConfigStatusResponse {
    const lncStatus = this.lncParserService.checkLncFiles(this.currentConfig.lncDir || undefined);

    const checkDir = (dirPath: string): DirCheckStatus => {
      const exists = fs.existsSync(dirPath);
      let fileCount = 0;
      if (exists) {
        try {
          const files = fs.readdirSync(dirPath);
          fileCount = files.length;
        } catch {}
      }
      return { path: dirPath, exists, fileCount };
    };

    return {
      config: { ...this.currentConfig },
      status: {
        lnc: lncStatus,
        confedLogo: checkDir(this.currentConfig.confedLogoDir),
        nationLogo: checkDir(this.currentConfig.nationLogoDir),
        compLogo: checkDir(this.currentConfig.compLogoDir),
        clubLogo: checkDir(this.currentConfig.clubLogoDir),
      },
    };
  }

  updateConfig(dto: Partial<AppPathsConfig>): ConfigStatusResponse {
    if (dto.lncDir !== undefined) {
      this.currentConfig.lncDir = dto.lncDir.trim();
      this.lncParserService.setBaseDir(this.currentConfig.lncDir);
    }
    if (dto.confedLogoDir !== undefined) {
      this.currentConfig.confedLogoDir = dto.confedLogoDir.trim();
    }
    if (dto.nationLogoDir !== undefined) {
      this.currentConfig.nationLogoDir = dto.nationLogoDir.trim();
    }
    if (dto.compLogoDir !== undefined) {
      this.currentConfig.compLogoDir = dto.compLogoDir.trim();
    }
    if (dto.clubLogoDir !== undefined) {
      this.currentConfig.clubLogoDir = dto.clubLogoDir.trim();
    }

    this.saveConfigToFile();

    // Reload logos service immediately with new directories
    this.logosService.reloadConfig({
      confedDir: this.currentConfig.confedLogoDir,
      nationDir: this.currentConfig.nationLogoDir,
      compDir: this.currentConfig.compLogoDir,
      clubDir: this.currentConfig.clubLogoDir,
    });

    return this.getConfig();
  }

  testPath(targetPath: string) {
    const cleanPath = targetPath.trim();
    const exists = fs.existsSync(cleanPath);
    if (!exists) {
      return { path: cleanPath, exists: false, isDirectory: false, fileCount: 0 };
    }
    try {
      const stat = fs.statSync(cleanPath);
      if (stat.isDirectory()) {
        const entries = fs.readdirSync(cleanPath);
        return {
          path: cleanPath,
          exists: true,
          isDirectory: true,
          fileCount: entries.length,
          preview: entries.slice(0, 10),
        };
      } else {
        return {
          path: cleanPath,
          exists: true,
          isDirectory: false,
          size: stat.size,
        };
      }
    } catch (err: any) {
      return { path: cleanPath, exists: true, error: err.message };
    }
  }

  async syncLncNow() {
    await this.lncParserService.parseAndSeed(this.currentConfig.lncDir || undefined);
    return { success: true, message: 'Sync completed successfully' };
  }

  reloadLogosNow() {
    this.logosService.loadMappings();
    return { success: true, stats: this.logosService.getStats() };
  }
}
