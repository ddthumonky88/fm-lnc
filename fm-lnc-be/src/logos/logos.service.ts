import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface LogoPathsConfig {
  confedDir?: string;
  nationDir?: string;
  compDir?: string;
  clubDir?: string;
}

export interface LogoStats {
  confederations: { dir: string; exists: boolean; count: number };
  nations: { dir: string; exists: boolean; count: number; configXmlCount: number };
  competitions: { dir: string; exists: boolean; count: number };
  clubs: { dir: string; exists: boolean; count: number };
}

@Injectable()
export class LogosService implements OnModuleInit {
  private readonly logger = new Logger(LogosService.name);

  private confedDir =
    process.env.CONFED_LOGO_DIR ||
    'D:\\Games\\Documents\\Sports Interactive\\Football Manager 2024\\graphics\\logo\\Confederations\\normal';

  private nationDir =
    process.env.NATION_LOGO_DIR ||
    'D:\\Games\\Documents\\Sports Interactive\\Football Manager 2024\\graphics\\logo\\Nations\\normal';

  private compDir =
    process.env.COMP_LOGO_DIR ||
    'D:\\Games\\Documents\\Sports Interactive\\Football Manager 2024\\graphics\\logo\\Competitions';

  private clubDir =
    process.env.CLUB_LOGO_DIR ||
    'D:\\Games\\Documents\\Sports Interactive\\Football Manager 2024\\graphics\\logo\\Club';

  // ID -> absolute file path maps
  private confedIdToPath: Map<string, string> = new Map();
  private nationIdToPath: Map<string, string> = new Map();
  private nationCodeToPath: Map<string, string> = new Map();
  private compIdToPath: Map<string, string> = new Map();
  private clubIdToPath: Map<string, string> = new Map();

  onModuleInit() {
    this.loadMappings();
  }

  reloadConfig(paths: LogoPathsConfig) {
    if (paths.confedDir !== undefined) this.confedDir = paths.confedDir;
    if (paths.nationDir !== undefined) this.nationDir = paths.nationDir;
    if (paths.compDir !== undefined) this.compDir = paths.compDir;
    if (paths.clubDir !== undefined) this.clubDir = paths.clubDir;
    this.loadMappings();
  }

  getConfig(): LogoPathsConfig {
    return {
      confedDir: this.confedDir,
      nationDir: this.nationDir,
      compDir: this.compDir,
      clubDir: this.clubDir,
    };
  }

  getStats(): LogoStats {
    const configXmlNationPath = path.join(this.nationDir, 'config.xml');
    return {
      confederations: {
        dir: this.confedDir,
        exists: fs.existsSync(this.confedDir),
        count: this.confedIdToPath.size,
      },
      nations: {
        dir: this.nationDir,
        exists: fs.existsSync(this.nationDir),
        count: this.nationIdToPath.size,
        configXmlCount: fs.existsSync(configXmlNationPath) ? 1 : 0,
      },
      competitions: {
        dir: this.compDir,
        exists: fs.existsSync(this.compDir),
        count: this.compIdToPath.size,
      },
      clubs: {
        dir: this.clubDir,
        exists: fs.existsSync(this.clubDir),
        count: this.clubIdToPath.size,
      },
    };
  }

  loadMappings() {
    this.logger.log('Loading logo mappings...');
    this.confedIdToPath.clear();
    this.nationIdToPath.clear();
    this.nationCodeToPath.clear();
    this.compIdToPath.clear();
    this.clubIdToPath.clear();

    try {
      this.scanConfederations();
      this.scanNations();
      this.scanCompetitions();
      this.scanClubs();
      this.logger.log(
        `Logo mappings loaded: ${this.confedIdToPath.size} confeds, ${this.nationIdToPath.size} nations, ${this.compIdToPath.size} comps, ${this.clubIdToPath.size} clubs`,
      );
    } catch (err: any) {
      this.logger.error(`Error loading logo mappings: ${err.message}`, err.stack);
    }
  }

  private scanConfederations() {
    if (!fs.existsSync(this.confedDir)) return;
    try {
      const files = fs.readdirSync(this.confedDir);
      for (const file of files) {
        if (file.toLowerCase().endsWith('.png')) {
          const id = path.basename(file, path.extname(file)).toLowerCase();
          this.confedIdToPath.set(id, path.join(this.confedDir, file));
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed scanning confederation logos: ${err.message}`);
    }
  }

  private scanNations() {
    if (!fs.existsSync(this.nationDir)) return;
    try {
      const files = fs.readdirSync(this.nationDir);
      for (const file of files) {
        if (file.toLowerCase().endsWith('.png')) {
          const name = path.basename(file, path.extname(file)).toLowerCase();
          const filePath = path.join(this.nationDir, file);
          if (/^\d+$/.test(name)) {
            this.nationIdToPath.set(name, filePath);
          } else {
            this.nationCodeToPath.set(name, filePath);
          }
        }
      }

      // Parse config.xml if exists
      const configXmlPath = path.join(this.nationDir, 'config.xml');
      if (fs.existsSync(configXmlPath)) {
        const xmlContent = fs.readFileSync(configXmlPath, 'utf8');
        const regex = /<record\s+from="([^"]+)"\s+to="graphics\/pictures\/nation\/(\d+)\/logo"/gi;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(xmlContent)) !== null) {
          const fileName = match[1];
          const nationId = match[2];
          const filePath = path.join(this.nationDir, `${fileName}.png`);
          if (fs.existsSync(filePath)) {
            this.nationIdToPath.set(nationId, filePath);
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed scanning nation logos: ${err.message}`);
    }
  }

  private scanCompetitions() {
    if (!fs.existsSync(this.compDir)) return;
    this.scanEntityDirectory(this.compDir, 'comp', this.compIdToPath);
  }

  private scanClubs() {
    if (!fs.existsSync(this.clubDir)) return;
    this.scanEntityDirectory(this.clubDir, 'club', this.clubIdToPath);
  }

  /**
   * Helper to scan directories recursively up to 3 levels for config.xml or {id}.png
   */
  private scanEntityDirectory(dir: string, entityKey: 'comp' | 'club', targetMap: Map<string, string>, depth = 0) {
    if (depth > 3 || !fs.existsSync(dir)) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      // 1. Direct png files named with ID
      for (const entry of entries) {
        if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
          const name = path.basename(entry.name, path.extname(entry.name));
          if (/^\d+$/.test(name) && !targetMap.has(name)) {
            targetMap.set(name, path.join(dir, entry.name));
          }
        }
      }

      // 2. Parse config.xml in this folder if present
      const configXmlPath = path.join(dir, 'config.xml');
      if (fs.existsSync(configXmlPath)) {
        try {
          const xmlContent = fs.readFileSync(configXmlPath, 'utf8');
          const regex = new RegExp(
            `<record\\s+from="([^"]+)"\\s+to="graphics\\/pictures\\/${entityKey}\\/(\\d+)\\/logo"`,
            'gi',
          );
          let match: RegExpExecArray | null;
          while ((match = regex.exec(xmlContent)) !== null) {
            const fileName = match[1];
            const entityId = match[2];
            const filePath = path.join(dir, `${fileName}.png`);
            if (fs.existsSync(filePath) && !targetMap.has(entityId)) {
              targetMap.set(entityId, filePath);
            }
          }
        } catch {
          // ignore xml parse error in individual subfolder
        }
      }

      // 3. Recurse into subdirectories
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          this.scanEntityDirectory(path.join(dir, entry.name), entityKey, targetMap, depth + 1);
        }
      }
    } catch {
      // ignore directory access error
    }
  }

  getConfederationLogoPath(id: number | string): string | null {
    const idStr = String(id).toLowerCase();
    if (this.confedIdToPath.has(idStr)) {
      return this.confedIdToPath.get(idStr)!;
    }
    const directPath = path.join(this.confedDir, `${idStr}.png`);
    if (fs.existsSync(directPath)) return directPath;
    return null;
  }

  getNationLogoPath(id: number | string, code?: string): string | null {
    const idStr = String(id);
    if (this.nationIdToPath.has(idStr)) {
      return this.nationIdToPath.get(idStr)!;
    }

    if (code) {
      const codeStr = code.trim().toLowerCase();
      if (this.nationCodeToPath.has(codeStr)) {
        return this.nationCodeToPath.get(codeStr)!;
      }
      const directCodePath = path.join(this.nationDir, `${codeStr}.png`);
      if (fs.existsSync(directCodePath)) return directCodePath;
    }

    const directIdPath = path.join(this.nationDir, `${idStr}.png`);
    if (fs.existsSync(directIdPath)) return directIdPath;

    return null;
  }

  getCompetitionLogoPath(id: number | string): string | null {
    const idStr = String(id);
    if (this.compIdToPath.has(idStr)) {
      return this.compIdToPath.get(idStr)!;
    }
    const directPath = path.join(this.compDir, `${idStr}.png`);
    if (fs.existsSync(directPath)) return directPath;
    return null;
  }

  getClubLogoPath(id: number | string): string | null {
    const idStr = String(id);
    if (this.clubIdToPath.has(idStr)) {
      return this.clubIdToPath.get(idStr)!;
    }
    const directPath = path.join(this.clubDir, `${idStr}.png`);
    if (fs.existsSync(directPath)) return directPath;
    return null;
  }
}
