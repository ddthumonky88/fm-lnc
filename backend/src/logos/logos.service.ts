import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LogosService implements OnModuleInit {
  private readonly logger = new Logger(LogosService.name);

  private readonly confedDir =
    process.env.CONFED_LOGO_DIR ||
    'D:\\Games\\Documents\\Sports Interactive\\Football Manager 2024\\graphics\\logo\\Confederations\\normal';

  private readonly nationDir =
    process.env.NATION_LOGO_DIR ||
    'D:\\Games\\Documents\\Sports Interactive\\Football Manager 2024\\graphics\\logo\\Nations\\normal';

  private idToFilenameMap: Map<string, string> = new Map();
  private availableNationFiles: Set<string> = new Set();
  private availableConfedFiles: Set<string> = new Set();

  onModuleInit() {
    this.loadMappings();
  }

  loadMappings() {
    try {
      // 1. Scan Confederation Files
      if (fs.existsSync(this.confedDir)) {
        const files = fs.readdirSync(this.confedDir);
        for (const file of files) {
          if (file.toLowerCase().endsWith('.png')) {
            this.availableConfedFiles.add(file.toLowerCase());
          }
        }
        this.logger.log(`Found ${this.availableConfedFiles.size} confederation logos in ${this.confedDir}`);
      } else {
        this.logger.warn(`Confederation logo directory not found: ${this.confedDir}`);
      }

      // 2. Scan Nation Files
      if (fs.existsSync(this.nationDir)) {
        const files = fs.readdirSync(this.nationDir);
        for (const file of files) {
          if (file.toLowerCase().endsWith('.png')) {
            this.availableNationFiles.add(file.toLowerCase());
          }
        }
        this.logger.log(`Found ${this.availableNationFiles.size} nation logos in ${this.nationDir}`);

        // 3. Parse Nations config.xml for ID -> filename mappings
        const configXmlPath = path.join(this.nationDir, 'config.xml');
        if (fs.existsSync(configXmlPath)) {
          const xmlContent = fs.readFileSync(configXmlPath, 'utf8');
          const regex = /<record\s+from="([^"]+)"\s+to="graphics\/pictures\/nation\/(\d+)\/logo"/gi;
          let match: RegExpExecArray | null;
          let count = 0;
          while ((match = regex.exec(xmlContent)) !== null) {
            const fileName = match[1].toLowerCase();
            const nationId = match[2];
            this.idToFilenameMap.set(nationId, fileName);
            count++;
          }
          this.logger.log(`Loaded ${count} nation ID mappings from config.xml`);
        }
      } else {
        this.logger.warn(`Nation logo directory not found: ${this.nationDir}`);
      }
    } catch (err: any) {
      this.logger.error(`Error loading logo mappings: ${err.message}`, err.stack);
    }
  }

  getConfederationLogoPath(id: number | string): string | null {
    const fileName = `${id}.png`.toLowerCase();
    if (this.availableConfedFiles.has(fileName)) {
      return path.join(this.confedDir, fileName);
    }
    const directPath = path.join(this.confedDir, `${id}.png`);
    if (fs.existsSync(directPath)) {
      return directPath;
    }
    return null;
  }

  getNationLogoPath(id: number | string, code?: string): string | null {
    const idStr = String(id);

    // 1. Try mapped filename from config.xml
    const mapped = this.idToFilenameMap.get(idStr);
    if (mapped) {
      const candidate = `${mapped}.png`.toLowerCase();
      if (this.availableNationFiles.has(candidate)) {
        return path.join(this.nationDir, candidate);
      }
    }

    // 2. Try by 3-letter code (e.g., alb.png, eng.png, vie.png)
    if (code) {
      const codeCandidate = `${code.trim().toLowerCase()}.png`;
      if (this.availableNationFiles.has(codeCandidate)) {
        return path.join(this.nationDir, codeCandidate);
      }
    }

    // 3. Try direct ID file (e.g., 765.png)
    const idCandidate = `${idStr}.png`;
    if (this.availableNationFiles.has(idCandidate)) {
      return path.join(this.nationDir, idCandidate);
    }

    return null;
  }
}
