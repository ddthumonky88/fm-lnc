# HỆ THỐNG QUẢN LÝ VÀ CHUYỂN ĐỔI DỮ LIỆU FOOTBALL MANAGER (.LNC)

**Tài liệu kỹ thuật, kiến trúc & source code bàn giao (Full-Stack: NestJS + Next.js + PostgreSQL)**

---

## 1. TỔNG QUAN HỆ THỐNG VÀ CẤU TRÚC PHÂN CẤP (HIERARCHY TREE)

Hệ thống quản lý cơ sở dữ liệu việt hóa, sửa đổi bản quyền và tùy biến tên gọi trong trò chơi **Football Manager** thông qua tệp tin `.lnc` (Licence/Name Changes).

### 1.1. Luồng dữ liệu phân cấp hình cây (Tree Flow)
Dựa theo mô hình tổ chức của Football Manager:
```
[Confederation / World] (Châu lục / Toàn cầu)
   ├──> [Competitions Quốc Tế] (e.g. UEFA Champions League, FIFA World Cup, Copa Libertadores)
   │        ├──> [Clubs tham gia giải quốc tế] (nếu cần quản lý theo giải)
   │        └──> [Awards thuộc giải đấu quốc tế] (e.g. UCL Player of the Season)
   │
   └──> [Nations] (Quốc gia thành viên)
            ├──> [Competitions Quốc Nội] (e.g. Premier League, V-League)
            │        ├──> [Clubs thuộc giải đấu]
            │        └──> [Awards thuộc giải đấu]
            ├──> [Clubs độc lập] (CLB tự do, phong trào, không thuộc giải cụ thể)
            ├──> [Awards độc lập] (Giải thưởng không gắn với giải đấu, e.g. Cầu thủ xuất sắc nhất năm quốc gia)
            ├──> [Stadiums] (Sân vận động thuộc quốc gia)
            └──> [Cities] (Thành phố thuộc quốc gia)
```

---

## 2. KIẾN TRÚC DATABASE (POSTGRESQL SCHEMA)

```sql
-- 1. Confederations (Châu lục / Liên đoàn / FIFA World)
CREATE TABLE confederations (
    id INT PRIMARY KEY,
    name VARCHAR(150) NOT NULL
);

-- 2. Nations (Quốc gia)
CREATE TABLE nations (
    id INT PRIMARY KEY,
    long_name VARCHAR(150) NOT NULL,
    short_name VARCHAR(100) NOT NULL,
    three_letter_name VARCHAR(10) NOT NULL,
    confederation_id INT REFERENCES confederations(id) ON DELETE SET NULL
);

-- 3. Cities (Thành phố thuộc Quốc gia)
CREATE TABLE cities (
    id INT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    country_id INT REFERENCES nations(id) ON DELETE SET NULL,
    categories VARCHAR(150)
);

-- 4. Competitions (Quốc tế: confed_id != NULL, nation_id = NULL; Quốc nội: nation_id != NULL)
CREATE TABLE competitions (
    id INT PRIMARY KEY,
    long_name VARCHAR(150) NOT NULL,
    short_name VARCHAR(100) NOT NULL,
    three_letter_name VARCHAR(10) NOT NULL,
    fg_color VARCHAR(20) DEFAULT '255 255 255',
    bg_color VARCHAR(20) DEFAULT '0 0 0',
    confed_id INT REFERENCES confederations(id) ON DELETE SET NULL,
    nation_id INT REFERENCES nations(id) ON DELETE SET NULL,
    categories VARCHAR(150),
    is_international BOOLEAN DEFAULT FALSE,
    note TEXT
);

-- 5. Clubs (Có thể trực thuộc Competition hoặc trực thuộc Nation tự do)
CREATE TABLE clubs (
    id INT PRIMARY KEY,
    long_name VARCHAR(150) NOT NULL,
    short_name VARCHAR(100) NOT NULL,
    six_letter_name VARCHAR(10),
    three_letter_name VARCHAR(10),
    nation_id INT REFERENCES nations(id) ON DELETE SET NULL,
    comp_id INT REFERENCES competitions(id) ON DELETE SET NULL,
    note TEXT
);

-- 6. Stadiums
CREATE TABLE stadiums (
    id INT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    nation_id INT REFERENCES nations(id) ON DELETE SET NULL,
    note TEXT
);

-- 7. Awards (Có thể gắn với Competition cụ thể hoặc Nation độc lập)
CREATE TABLE awards (
    id INT PRIMARY KEY,
    long_name VARCHAR(150) NOT NULL,
    short_name VARCHAR(100) NOT NULL,
    nation_id INT REFERENCES nations(id) ON DELETE SET NULL,
    comp_id INT REFERENCES competitions(id) ON DELETE SET NULL
);

-- 8. People (Cầu thủ, HLV)
CREATE TABLE people (
    id INT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    common_name VARCHAR(100) DEFAULT '',
    second_name VARCHAR(100) NOT NULL
);

-- 9. Stages
CREATE TABLE stages (
    id INT PRIMARY KEY,
    name VARCHAR(150) NOT NULL
);
```

---

## 3. BACKEND (NESTJS + TYPEORM)

### 3.1. Entity Competition (`src/entities/competition.entity.ts`)
```typescript
import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Nation } from './nation.entity';
import { Confederation } from './confederation.entity';
import { Club } from './club.entity';
import { Award } from './award.entity';

@Entity('competitions')
export class Competition {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ type: 'varchar', length: 150 })
  long_name: string;

  @Column({ type: 'varchar', length: 100 })
  short_name: string;

  @Column({ type: 'varchar', length: 10 })
  three_letter_name: string;

  @Column({ type: 'varchar', length: 20, default: '255 255 255' })
  fg_color: string;

  @Column({ type: 'varchar', length: 20, default: '0 0 0' })
  bg_color: string;

  @Column({ type: 'int', nullable: true })
  confed_id: number;

  @Column({ type: 'int', nullable: true })
  nation_id: number;

  @Column({ type: 'varchar', length: 150, nullable: true })
  categories: string;

  @Column({ type: 'boolean', default: false })
  is_international: boolean;

  @Column({ type: 'text', nullable: true })
  note: string;

  @ManyToOne(() => Confederation, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'confed_id' })
  confederation: Confederation;

  @ManyToOne(() => Nation, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'nation_id' })
  nation: Nation;

  @OneToMany(() => Club, (club) => club.competition)
  clubs: Club[];

  @OneToMany(() => Award, (award) => award.competition)
  awards: Award[];
}
```

### 3.2. LNC Exporter Engine theo chuẩn Header (`src/lnc/lnc.service.ts`)
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Nation } from '../entities/nation.entity';
import { City } from '../entities/city.entity';
import { Competition } from '../entities/competition.entity';
import { Club } from '../entities/club.entity';
import { Stadium } from '../entities/stadium.entity';
import { Award } from '../entities/award.entity';
import { Person } from '../entities/person.entity';
import { Stage } from '../entities/stage.entity';

@Injectable()
export class LncService {
  constructor(
    @InjectRepository(Nation) private nationRepo: Repository<Nation>,
    @InjectRepository(City) private cityRepo: Repository<City>,
    @InjectRepository(Competition) private compRepo: Repository<Competition>,
    @InjectRepository(Club) private clubRepo: Repository<Club>,
    @InjectRepository(Stadium) private stadiumRepo: Repository<Stadium>,
    @InjectRepository(Award) private awardRepo: Repository<Award>,
    @InjectRepository(Person) private personRepo: Repository<Person>,
    @InjectRepository(Stage) private stageRepo: Repository<Stage>,
  ) {}

  async exportLnc(): Promise<string> {
    let out = '';
    const hr = '#====================================================================================\n';

    // 1. NATIONS
    const nations = await this.nationRepo.find({ relations: ['confederation'] });
    for (const nat of nations) {
      const confName = nat.confederation?.name || 'WORLD';
      out += `# NATION > ${confName}\n${hr}`;
      out += `"NATION_LONG_NAME_CHANGE"\t${nat.id}\t\t"${nat.long_name}"\t\t\t\t8\n`;
      out += `"NATION_SHORT_NAME_CHANGE"\t${nat.id}\t\t"${nat.short_name}"\t\t\t\t8\n`;
      out += `"NATION_3LETTER_NAME_CHANGE"\t${nat.id}\t\t"${nat.three_letter_name}"\t\t\t8\n\n`;
    }

    // 2. CITIES
    const cities = await this.cityRepo.find({ relations: ['nation'] });
    for (const c of cities) {
      const code = c.nation?.three_letter_name || 'UNK';
      const nat = c.nation?.short_name || 'Unknown';
      const cat = c.categories || 'Default';
      out += `# CITY > [${code}] ${nat} > ${cat}\n${hr}`;
      out += `"CITY_NAME_CHANGE"\t\t${c.id}\t\t"${c.name}"\t\t\t\t""\n\n`;
    }

    // 3. COMPETITIONS (Bao gồm Quốc tế thuộc Châu Lục/World và Quốc nội thuộc Nation)
    const comps = await this.compRepo.find({ relations: ['nation', 'confederation'] });
    for (const comp of comps) {
      const conf = comp.confederation?.name || 'INTERNATIONAL';
      const isInter = comp.is_international || !comp.nation_id;
      const natCode = comp.nation?.three_letter_name || (isInter ? 'INT' : 'NAT');
      const natName = comp.nation?.short_name || (isInter ? 'International' : 'National');
      const cat = comp.categories || (isInter ? 'International Competitions' : 'League/Cup');

      out += `# COMP > ${conf} > [${natCode}] ${natName} > ${cat}\n${hr}`;
      out += `"COMP_COLOUR_CHANGE"\t\t${comp.id}\t\t0 ${comp.fg_color || '255 255 255'} ${comp.bg_color || '0 0 0'}\t\t""\n`;
      out += `"COMP_LONG_NAME_CHANGE"\t${comp.id}\t\t"${comp.long_name}"\t\t\t\t\t""\n`;
      out += `"COMP_SHORT_NAME_CHANGE"\t${comp.id}\t\t"${comp.short_name}"\t\t\t\t\t""\n`;
      out += `"COMP_3LETTER_NAME_CHANGE"\t${comp.id}\t\t"${comp.three_letter_name}"\t\t\t\t""\n\n`;
    }

    // 4. CLUBS
    const clubs = await this.clubRepo.find({ relations: ['nation', 'competition', 'nation.confederation'] });
    for (const cl of clubs) {
      const conf = cl.nation?.confederation?.name || 'CONFED';
      const code = cl.nation?.three_letter_name || 'NAT';
      const nat = cl.nation?.short_name || 'Nation';
      const comp = cl.competition?.long_name || 'Free Club / Independent';
      const noteStr = cl.note ? `  # ${cl.note}` : '';

      out += `# CLUB > ${conf} > [${code}] ${nat} > ${comp}\n${hr}`;
      out += `"CLUB_NAME_CHANGE"\t\t${cl.id}\t"${cl.long_name}"\t\t\t\t\t\t""${noteStr}\n`;
      out += `"CLUB_SHORT_NAME_CHANGE"\t${cl.id}\t"${cl.short_name}"\t\t\t\t\t\t""${noteStr}\n`;
      if (cl.six_letter_name) {
        out += `"CLUB_6LETTER_NAME_CHANGE"\t${cl.id}\t"${cl.six_letter_name}"\t\t\t\t\t\t""${noteStr}\n`;
      }
      if (cl.three_letter_name) {
        out += `"CLUB_3LETTER_NAME_CHANGE"\t${cl.id}\t"${cl.three_letter_name}"\t\t\t\t\t\t""${noteStr}\n`;
      }
      out += '\n';
    }

    // 5. STADIUMS
    const stadiums = await this.stadiumRepo.find({ relations: ['nation'] });
    for (const s of stadiums) {
      const code = s.nation?.three_letter_name || 'UNK';
      const nat = s.nation?.short_name || 'Standard';
      out += `# STADIUM > [${code}] ${nat} > Standard\n${hr}`;
      out += `"STADIUM_NAME_CHANGE"\t\t${s.id}\t\t"${s.name}"\t\t\t\t""\n\n`;
    }

    // 6. AWARDS (Gồm cả award thuộc comp và award độc lập theo nation)
    const awards = await this.awardRepo.find({ relations: ['nation', 'competition'] });
    for (const a of awards) {
      const code = a.nation?.three_letter_name || 'INT';
      const nat = a.nation?.short_name || 'International';
      const sub = a.competition?.short_name ? ` > ${a.competition.short_name}` : '';
      out += `# AWARDS > [${code}] ${nat}${sub}\n${hr}`;
      out += `"AWARD_LONG_NAME_CHANGE"\t${a.id}\t"${a.long_name}"\t\t\t\t\t\t""\n`;
      out += `"AWARD_SHORT_NAME_CHANGE"\t${a.id}\t"${a.short_name}"\t\t\t\t\t\t""\n\n`;
    }

    // 7. PEOPLE
    const people = await this.personRepo.find();
    if (people.length > 0) {
      out += `# PEOPLE\n${hr}`;
      for (const p of people) {
        out += `"CHANGE_PLAYER_NAME"\t${p.id}\t"${p.first_name}"\t\t"${p.common_name}"\t\t\t"${p.second_name}"\n`;
      }
      out += '\n';
    }

    // 8. STAGES
    const stages = await this.stageRepo.find();
    if (stages.length > 0) {
      out += `# STAGES\n${hr}`;
      for (const st of stages) {
        out += `"STAGE_NAME_LONG_NAME_CHANGE"\t\t${st.id}\t\t"${st.name}"\t\t\t\t8\n`;
      }
      out += '\n';
    }

    return out;
  }
}
```

---

## 4. FRONTEND (NEXT.JS 14 APP ROUTER)

Giao diện hoàn chỉnh với breadcrumb bar xanh nhạt, card grid 4 cột, progress bar 100%, tách biệt rõ **Competitions Quốc Tế (trực thuộc Confederation/World)** và **Nations &rarr; Competitions Quốc Nội / CLB / Sân / Thành phố**.

```tsx
// app/page.tsx
'use client';

import React, { useState, useMemo } from 'react';

type HierarchyLevel =
  | 'CONTINENTS'
  | 'CONTINENT_OPTIONS'
  | 'INT_COMPETITIONS'
  | 'NATIONS'
  | 'NATION_HUB'
  | 'DOMESTIC_COMPS'
  | 'CLUBS_IN_COMP'
  | 'INDEPENDENT_CLUBS'
  | 'STADIUMS'
  | 'CITIES'
  | 'INDEPENDENT_AWARDS';

interface NavStep {
  level: HierarchyLevel;
  id?: number;
  title: string;
}

export default function LncSortitoutsiExplorer() {
  const [navStack, setNavStack] = useState<NavStep[]>([
    { level: 'CONTINENTS', title: 'Continents' }
  ]);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock Confederations / World
  const confederations = [
    { id: 1, name: 'Africa', totalNations: 56, totalIntComps: 12 },
    { id: 2, name: 'Asia', totalNations: 47, totalIntComps: 15 },
    { id: 3, name: 'Europe', totalNations: 55, totalIntComps: 24 },
    { id: 4, name: 'North America', totalNations: 41, totalIntComps: 9 },
    { id: 5, name: 'Oceania', totalNations: 13, totalIntComps: 6 },
    { id: 6, name: 'South America', totalNations: 10, totalIntComps: 8 },
    { id: 7, name: 'World', totalNations: 211, totalIntComps: 18 },
  ];

  // Mock International Competitions (trực thuộc Châu Lục hoặc World)
  const intCompetitions = [
    { id: 1301380, name: 'UEFA Champions League', short: 'UCL', confed_id: 3, code: 'EUR' },
    { id: 1301381, name: 'UEFA Europa League', short: 'UEL', confed_id: 3, code: 'EUR' },
    { id: 1301382, name: 'UEFA Europa Conference League', short: 'UECL', confed_id: 3, code: 'EUR' },
    { id: 1024001, name: 'FIFA World Cup', short: 'WC', confed_id: 7, code: 'INT' },
    { id: 1024002, name: 'FIFA Club World Cup', short: 'FCWC', confed_id: 7, code: 'INT' },
  ];

  // Mock Nations
  const nations = [
    { id: 5, name: 'Algeria', confed_id: 1, code: 'ALG' },
    { id: 6, name: 'Angola', confed_id: 1, code: 'ANG' },
    { id: 7, name: 'Benin', confed_id: 1, code: 'BEN' },
    { id: 8, name: 'Botswana', confed_id: 1, code: 'BOT' },
    { id: 11, name: 'Cameroon', confed_id: 1, code: 'CMR' },
    { id: 765, name: 'England', confed_id: 3, code: 'ENG' },
    { id: 769, name: 'France', confed_id: 3, code: 'FRA' },
    { id: 771, name: 'Germany', confed_id: 3, code: 'GER' },
  ];

  const currentStep = navStack[navStack.length - 1];

  const pushStep = (step: NavStep) => setNavStack([...navStack, step]);
  const jumpTo = (index: number) => setNavStack(navStack.slice(0, index + 1));

  // Lọc dữ liệu theo search
  const filteredConfeds = useMemo(() => {
    return confederations.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-[#333333] font-sans antialiased pb-12">
      {/* Top Search Header */}
      <header className="bg-white border-b border-gray-200 py-3 px-6 sticky top-0 z-30 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-normal text-gray-600">Quick Search Cut-Out Facepack</span>
          <input
            type="text"
            placeholder="Search for a game item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm w-72 focus:outline-none focus:border-blue-500 bg-white"
          />
        </div>
        <button
          onClick={() => window.location.href = 'http://localhost:3001/api/lnc/export'}
          className="bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-semibold px-4 py-2 rounded shadow transition"
        >
          Xuất File .LNC
        </button>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 mt-6">
        {/* Ribbon Header Thanh Tiêu Đề */}
        <div className="bg-[#e2f0fd] rounded-t-lg border border-[#cbe4fa] px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-[#1e3a8a] font-semibold flex-wrap">
            {navStack.map((step, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-gray-400 font-normal">/</span>}
                <button
                  onClick={() => jumpTo(idx)}
                  className={`hover:underline ${idx === navStack.length - 1 ? 'text-gray-900 font-bold' : ''}`}
                >
                  {step.title}
                </button>
              </React.Fragment>
            ))}
            {currentStep.id && (
              <span className="flex items-center text-xs font-normal text-gray-500 ml-2">
                <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                </svg>
                {currentStep.id}
              </span>
            )}
          </div>
          <button className="w-6 h-6 rounded-full bg-[#1e88e5] text-white flex items-center justify-center text-xs shadow hover:bg-blue-600">
            &hellip;
          </button>
        </div>

        {/* Thân danh mục chính */}
        <div className="bg-white border border-[#cbe4fa] border-t-0 rounded-b-lg p-5 shadow-sm min-h-[480px]">
          
          {/* 1. MÀN HÌNH CHÂU LỤC / CONTINENTS */}
          {currentStep.level === 'CONTINENTS' && (
            <div>
              <h2 className="text-sm font-bold text-gray-700 mb-3">Continents</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {filteredConfeds.map((confed) => (
                  <div
                    key={confed.id}
                    className="border border-gray-200 rounded-md bg-white p-3.5 hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                          {confed.name[0]}
                        </span>
                        <button
                          onClick={() => pushStep({
                            level: 'CONTINENT_OPTIONS',
                            id: confed.id,
                            title: `${confed.name}`
                          })}
                          className="font-bold text-[#1d70b8] hover:underline text-sm text-left"
                        >
                          {confed.name}
                        </button>
                      </div>
                      <div className="flex items-center text-xs text-gray-500 mb-3">
                        <span className="mr-1">ID:</span> {confed.id}
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-2 space-y-1 text-xs">
                      {/* Nhánh 1: Countries */}
                      <button
                        onClick={() => pushStep({
                          level: 'NATIONS',
                          id: confed.id,
                          title: `${confed.name} - Countries`
                        })}
                        className="text-[#1d70b8] hover:underline block text-left"
                      >
                        List Countries ({confed.totalNations})
                      </button>

                      {/* Nhánh 2: Competitions Quốc Tế trực thuộc Confederation/World */}
                      <button
                        onClick={() => pushStep({
                          level: 'INT_COMPETITIONS',
                          id: confed.id,
                          title: `${confed.name} - International Competitions`
                        })}
                        className="text-[#1d70b8] font-medium hover:underline block text-left text-emerald-700"
                      >
                        International Competitions ({confed.totalIntComps})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. MENU TRUNG GIAN KHI CLICK VÀO TÊN CHÂU LỤC */}
          {currentStep.level === 'CONTINENT_OPTIONS' && (
            <div className="max-w-xl mx-auto py-8 text-center space-y-4">
              <h2 className="text-base font-bold text-gray-800">Chọn nhánh quản lý trực thuộc {currentStep.title}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div
                  onClick={() => pushStep({ level: 'INT_COMPETITIONS', id: currentStep.id, title: `${currentStep.title} - International Competitions` })}
                  className="border border-emerald-300 bg-emerald-50/50 p-4 rounded-md cursor-pointer hover:shadow-md transition"
                >
                  <h3 className="font-bold text-sm text-emerald-900 mb-1">Competitions Quốc Tế</h3>
                  <p className="text-xs text-gray-600">Giải đấu cúp liên lục địa / châu lục (e.g. UCL, UEL, World Cup) & giải thưởng thuộc giải.</p>
                </div>
                <div
                  onClick={() => pushStep({ level: 'NATIONS', id: currentStep.id, title: `${currentStep.title} - Countries` })}
                  className="border border-blue-300 bg-blue-50/50 p-4 rounded-md cursor-pointer hover:shadow-md transition"
                >
                  <h3 className="font-bold text-sm text-blue-900 mb-1">Countries (Quốc Gia)</h3>
                  <p className="text-xs text-gray-600">Danh sách các liên đoàn quốc gia thành viên trực thuộc.</p>
                </div>
              </div>
            </div>
          )}

          {/* 3. COMPETITIONS QUỐC TẾ (TRỰC THUỘC CHÂU LỤC / WORLD) */}
          {currentStep.level === 'INT_COMPETITIONS' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold text-gray-700">Competitions Quốc Tế Trực Thuộc</h2>
                <button className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded font-medium">
                  + Thêm Giải Đấu Quốc Tế
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {intCompetitions
                  .filter(c => currentStep.id === undefined || c.confed_id === currentStep.id)
                  .map((comp) => (
                    <div key={comp.id} className="border border-gray-200 rounded-md bg-white p-3.5 hover:shadow-md flex flex-col justify-between">
                      <div>
                        <div className="font-bold text-sm text-[#1d70b8] mb-1">{comp.name}</div>
                        <div className="text-xs text-gray-500 mb-1">Mã: {comp.short} | FM ID: {comp.id}</div>
                        <div className="w-full bg-emerald-600 text-[10px] text-white text-center font-bold py-0.5 rounded-sm mb-3">
                          100%
                        </div>
                      </div>
                      <div className="border-t border-gray-100 pt-2 text-xs space-y-1">
                        <button
                          onClick={() => pushStep({ level: 'CLUBS_IN_COMP', id: comp.id, title: `${comp.short} - Clubs` })}
                          className="text-[#1d70b8] hover:underline block text-left"
                        >
                          Clubs Tham Dự
                        </button>
                        <span className="text-gray-500 hover:underline block cursor-pointer">Awards Thuộc Giải</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 4. DANH SÁCH QUỐC GIA (NATIONS) */}
          {currentStep.level === 'NATIONS' && (
            <div>
              <h2 className="text-sm font-bold text-gray-700 mb-3">Countries</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {nations.map((nat) => (
                  <div key={nat.id} className="border border-gray-200 rounded-md bg-white p-3.5 hover:shadow-md flex flex-col justify-between">
                    <div>
                      <button
                        onClick={() => pushStep({ level: 'NATION_HUB', id: nat.id, title: `[${nat.code}] ${nat.name}` })}
                        className="font-bold text-[#1d70b8] hover:underline text-sm block mb-1 text-left"
                      >
                        {nat.name}
                      </button>
                      <div className="text-xs text-gray-500 mb-2">ID: {nat.id} | Mã: {nat.code}</div>
                      <div className="text-[11px] text-gray-600 mb-1">0 out of 0</div>
                      <div className="w-full bg-emerald-600 text-[10px] text-white text-center font-bold py-0.5 rounded-sm mb-3">
                        100%
                      </div>
                    </div>
                    <div className="border-t border-gray-100 pt-2 text-xs space-y-0.5">
                      <button
                        onClick={() => pushStep({ level: 'NATION_HUB', id: nat.id, title: `[${nat.code}] ${nat.name}` })}
                        className="text-[#1d70b8] hover:underline block text-left"
                      >
                        List Children
                      </button>
                      <span className="text-[#1d70b8] hover:underline block cursor-pointer">Recently Active</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. CÁC NHÁNH CON TRỰC THUỘC NATION */}
          {currentStep.level === 'NATION_HUB' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-gray-700 mb-3">Cấu trúc tài nguyên thuộc {currentStep.title}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Competitions quốc nội */}
                <div
                  onClick={() => pushStep({ level: 'DOMESTIC_COMPS', id: currentStep.id, title: `${currentStep.title} - Domestic Competitions` })}
                  className="border border-gray-200 p-4 rounded bg-white hover:border-blue-400 cursor-pointer shadow-sm"
                >
                  <h3 className="font-bold text-sm text-[#1d70b8] mb-1">Competitions (Giải Quốc Nội)</h3>
                  <p className="text-xs text-gray-600">Quản lý các giải VĐQG, Cúp quốc gia, CLB trực thuộc và giải thưởng giải đấu.</p>
                </div>

                {/* Clubs độc lập */}
                <div
                  onClick={() => pushStep({ level: 'INDEPENDENT_CLUBS', id: currentStep.id, title: `${currentStep.title} - Independent Clubs` })}
                  className="border border-gray-200 p-4 rounded bg-white hover:border-blue-400 cursor-pointer shadow-sm"
                >
                  <h3 className="font-bold text-sm text-[#1d70b8] mb-1">Clubs (Độc Lập)</h3>
                  <p className="text-xs text-gray-600">Các câu lạc bộ tự do không thuộc bất kỳ giải đấu cố định nào.</p>
                </div>

                {/* Stadiums */}
                <div
                  onClick={() => pushStep({ level: 'STADIUMS', id: currentStep.id, title: `${currentStep.title} - Stadiums` })}
                  className="border border-gray-200 p-4 rounded bg-white hover:border-blue-400 cursor-pointer shadow-sm"
                >
                  <h3 className="font-bold text-sm text-[#1d70b8] mb-1">Stadiums (Sân Vận Động)</h3>
                  <p className="text-xs text-gray-600">Danh mục sân bãi, sức chứa và ghi chú sân vận động quốc gia.</p>
                </div>

                {/* Cities */}
                <div
                  onClick={() => pushStep({ level: 'CITIES', id: currentStep.id, title: `${currentStep.title} - Cities` })}
                  className="border border-gray-200 p-4 rounded bg-white hover:border-blue-400 cursor-pointer shadow-sm"
                >
                  <h3 className="font-bold text-sm text-[#1d70b8] mb-1">Cities (Thành Phố)</h3>
                  <p className="text-xs text-gray-600">Tên thành phố và phân loại vùng địa lý trực thuộc.</p>
                </div>

                {/* Awards độc lập */}
                <div
                  onClick={() => pushStep({ level: 'INDEPENDENT_AWARDS', id: currentStep.id, title: `${currentStep.title} - Awards` })}
                  className="border border-gray-200 p-4 rounded bg-white hover:border-blue-400 cursor-pointer shadow-sm"
                >
                  <h3 className="font-bold text-sm text-[#1d70b8] mb-1">Awards (Giải Thưởng Độc Lập)</h3>
                  <p className="text-xs text-gray-600">Các danh hiệu không gắn liền trực tiếp với giải đấu nào.</p>
                </div>
              </div>
            </div>
          )}

          {/* 6. MÀN HÌNH BẢNG CHI TIẾT KHI DUYỆT ĐẾN TẬN CÙNG */}
          {['DOMESTIC_COMPS', 'CLUBS_IN_COMP', 'INDEPENDENT_CLUBS', 'STADIUMS', 'CITIES', 'INDEPENDENT_AWARDS'].includes(currentStep.level) && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-700">Dữ liệu chi tiết: {currentStep.title}</h3>
                <button className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded font-medium">
                  + Thêm Bản Ghi Mới
                </button>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-600 border-b border-gray-200 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">FM ID</th>
                      <th className="py-2.5 px-3">Tên Chi Tiết / Long Name</th>
                      <th className="py-2.5 px-3">Tên Ngắn / Code</th>
                      <th className="py-2.5 px-3">Ghi Chú</th>
                      <th className="py-2.5 px-3 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-600">102422</td>
                      <td className="py-2.5 px-3 font-medium">Manchester United FC</td>
                      <td className="py-2.5 px-3">Man Utd / MUN</td>
                      <td className="py-2.5 px-3 text-gray-500">Fix name licenced</td>
                      <td className="py-2.5 px-3 text-right space-x-2">
                        <button className="text-blue-600 hover:underline">Sửa</button>
                        <button className="text-red-500 hover:underline">Xóa</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
```

---

## 5. HƯỚNG DẪN TRIỂN KHAI VÀ VẬN HÀNH

1. **Khởi tạo Database PostgreSQL:**
   ```bash
   psql -U postgres -c "CREATE DATABASE fm_lnc_db;"
   ```
2. **Khởi động Backend (NestJS):**
   ```bash
   cd fm-lnc-be
   npm install
   npm run start:dev   # Chạy tại http://localhost:3001
   ```
3. **Khởi động Frontend (Next.js):**
   ```bash
   cd fm-lnc-fe
   npm install
   npm run dev         # Chạy tại http://localhost:3000
   ```