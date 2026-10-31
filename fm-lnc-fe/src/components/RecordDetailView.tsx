'use client';

import React, { useState } from 'react';
import { Tag, Button, Tooltip, message } from 'antd';
import {
  CopyOutlined,
  CheckOutlined,
  EditOutlined,
  InfoCircleOutlined,
  EnvironmentOutlined,
  UserOutlined,
  AppstoreOutlined,
  BranchesOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { EntityType, RecordType } from '../types';
import {
  NationIcon,
  IntCompIcon,
  DomesticCompIcon,
  ClubIcon,
  StadiumIcon,
  CityIcon,
  AwardIcon,
} from './EntityIcons';
import { getNationLogoUrl } from '../services/api';

const parseColor = (rgbStr?: string | null) => {
  if (!rgbStr || typeof rgbStr !== 'string') return null;
  const parts = rgbStr.trim().split(/\s+/).map(Number);
  if (parts.length >= 3 && parts.every((n) => !isNaN(n) && n >= 0 && n <= 255)) {
    const [r, g, b] = parts;
    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    const contrast = yiq >= 128 ? '#1e293b' : '#ffffff';
    return {
      css: `rgb(${r}, ${g}, ${b})`,
      hex,
      rgb: `rgb(${r}, ${g}, ${b})`,
      contrast,
    };
  }
  return null;
};

const CONFED_LOOKUP: Record<string, { id: string; name: string }> = {
  '1': { id: 'CAF', name: 'CAF' },
  CAF: { id: 'CAF', name: 'CAF' },
  AFRICA: { id: 'CAF', name: 'CAF' },

  '2': { id: 'AFC', name: 'AFC' },
  AFC: { id: 'AFC', name: 'AFC' },
  ASIA: { id: 'AFC', name: 'AFC' },

  '3': { id: 'UEFA', name: 'UEFA' },
  UEFA: { id: 'UEFA', name: 'UEFA' },
  EUROPE: { id: 'UEFA', name: 'UEFA' },

  '4': { id: 'CONCACAF', name: 'CONCACAF' },
  CONCACAF: { id: 'CONCACAF', name: 'CONCACAF' },
  'NORTH AMERICA': { id: 'CONCACAF', name: 'CONCACAF' },

  '5': { id: 'OFC', name: 'OFC' },
  OFC: { id: 'OFC', name: 'OFC' },
  OCEANIA: { id: 'OFC', name: 'OFC' },

  '6': { id: 'CONMEBOL', name: 'CONMEBOL' },
  CONMEBOL: { id: 'CONMEBOL', name: 'CONMEBOL' },
  'SOUTH AMERICA': { id: 'CONMEBOL', name: 'CONMEBOL' },

  '7': { id: 'WORLD', name: 'World' },
  WORLD: { id: 'WORLD', name: 'World' },
  INTERNATIONAL: { id: 'WORLD', name: 'World' },
  FIFA: { id: 'WORLD', name: 'World' },
  GLOBAL: { id: 'WORLD', name: 'World' },

  '8': { id: 'EXTINCT', name: 'Extinct' },
  EXTINCT: { id: 'EXTINCT', name: 'Extinct' },
};

export interface RecordDetailViewProps {
  data: any;
  type: EntityType | RecordType | string;
  showHeader?: boolean;
  hideClubAffiliates?: boolean;
  counts?: {
    domesticComps?: number;
    stadiums?: number;
    cities?: number;
    awards?: number;
    independentClubs?: number;
    extinctClubs?: number;
    parentComps?: number;
    clubs?: number;
    allClubs?: number;
    totalAwards?: number;
    regions?: number;
    totalNations?: number;
    totalIntComps?: number;
  };
  onEdit?: () => void;
  onNavigateConfed?: (confedId: string) => void;
  onNavigateNation?: (nationId: string) => void;
  onNavigateParentComp?: (compId: string) => void;
  onNavigateComp?: (compId: string) => void;
  onNavigateClub?: (clubId: string) => void;
  onSwitchTab?: (tabKey: string) => void;
  onNavigateFakeComp?: (fakeCompId: string) => void;
}

export default function RecordDetailView({
  data,
  type,
  showHeader = false,
  hideClubAffiliates = false,
  counts,
  onEdit,
  onNavigateConfed,
  onNavigateNation,
  onNavigateParentComp,
  onNavigateComp,
  onNavigateClub,
  onSwitchTab,
  onNavigateFakeComp,
}: RecordDetailViewProps) {
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const currentData = data;

  const isPlayer = type === EntityType.PLAYER;
  const isCity = type === EntityType.CITY;
  const isStadium = type === EntityType.STADIUM;
  const isComp =
    type === EntityType.COMPETITION || (type as string) === 'international_competition';
  const isClub = type === EntityType.CLUB;
  const isNation = type === EntityType.NATION;
  const isConfed = type === EntityType.CONFEDERATION;
  const isStage = type === EntityType.STAGE;
  const isAward = type === EntityType.AWARD;
  const statsClub = currentData.stats?.club;
  const statsClubCount =
    statsClub && typeof statsClub === 'object' ? statsClub.total : statsClub;

  const isVirtual = Boolean(
    currentData.is_virtual ||
      currentData.id === '[EXTINCT]' ||
      currentData.id === '[OTHER]' ||
      String(currentData.id).startsWith('oth-') ||
      String(currentData.id).startsWith('ext-') ||
      currentData.id === 'extinct' ||
      currentData.id === 'other',
  );

  const isVirtualExtinct =
    isVirtual &&
    (currentData.virtual_type === 'EXTINCT' ||
      currentData.id === '[EXTINCT]' ||
      String(currentData.id).startsWith('ext-') ||
      currentData.id === 'extinct');

  const isInternationalComp =
    isComp &&
    Boolean(
      currentData.is_international ||
        type === 'international_competition' ||
        (!currentData.nation_id && !currentData.nation &&
          (currentData.confed_id || currentData.confed || currentData.categories || currentData.type)),
    );

  const rawConfedVal =
    (typeof currentData.confed === 'string'
      ? currentData.confed
      : currentData.confed?.id || currentData.confed?.name) ||
    currentData.confed_id ||
    currentData.confed_name ||
    (typeof currentData.nation?.confed === 'string'
      ? currentData.nation.confed
      : currentData.nation?.confed?.id || currentData.nation?.confed?.name) ||
    currentData.nation?.confed_id ||
    (typeof currentData.comp?.confed === 'string'
      ? currentData.comp.confed
      : currentData.comp?.confed?.id || currentData.comp?.confed?.name) ||
    null;

  const confedLookupKey = rawConfedVal ? String(rawConfedVal).trim().toUpperCase() : null;
  const resolvedConfed = confedLookupKey ? CONFED_LOOKUP[confedLookupKey] : null;

  const confedId = resolvedConfed?.id || (rawConfedVal ? String(rawConfedVal) : null);
  const confedName =
    resolvedConfed?.name ||
    (rawConfedVal ? String(rawConfedVal) : isInternationalComp ? 'World' : null);

  const nationId = isNation
    ? currentData.id
    : currentData.nation?.id || currentData.nation_id || currentData.country_id;
  const nationName = isNation
    ? currentData.name_lg || currentData.name || currentData.name_sh
    : currentData.nation?.name_lg || currentData.nation?.name || currentData.nation?.name_sh;
  const nationCode = isNation
    ? currentData.name_3l || currentData.code
    : currentData.nation?.name_3l;

  const inactiveList = (currentData.inactive_fields || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);

  const isFieldInactive = (field: string | string[]) => {
    const fields = Array.isArray(field) ? field : [field];
    return fields.some((f) => {
      const lower = f.toLowerCase();
      return (
        inactiveList.includes(lower) ||
        inactiveList.some((item: string) => item.toLowerCase() === lower)
      );
    });
  };

  const getLabelClass = (field?: string | string[], extraClass: string = '') => {
    const inactive = field ? isFieldInactive(field) : false;
    return `${
      inactive ? 'text-red-600 font-normal' : 'text-slate-400 font-semibold'
    } text-xs shrink-0 select-none whitespace-nowrap leading-tight ${extraClass}`;
  };

  const getValueClass = (field?: string | string[], defaultClass: string = 'text-slate-800') => {
    const inactive = field ? isFieldInactive(field) : false;
    return inactive ? 'text-red-600' : defaultClass;
  };

  const getTypeLabel = () => {
    if (isInternationalComp) return 'International Competition';
    if (isVirtual) return 'Virtual Group';
    if (isClub) return 'Club';
    if (isComp) return 'Domestic Competition';
    if (isNation) return 'Nation';
    if (isConfed) return 'Confederation';
    if (isStadium) return 'Stadium';
    if (isCity) return 'City';
    if (isAward) return 'Award';
    if (isPlayer) return 'Person';
    if (isStage) return 'Stage';
    return String(type).toUpperCase();
  };

  const getTypeBadgeStyles = () => {
    if (isInternationalComp) return 'bg-purple-50/90 border-purple-300 text-purple-600';
    if (isComp) return 'bg-amber-50/90 border-amber-300 text-amber-600';
    if (isClub) return 'bg-blue-50/90 border-blue-300 text-blue-600';
    if (isNation) return 'bg-cyan-50/90 border-cyan-300 text-cyan-600';
    if (isConfed) return 'bg-indigo-50/90 border-indigo-300 text-indigo-600';
    if (isPlayer) return 'bg-purple-50/90 border-purple-300 text-purple-600';
    if (isStadium) return 'bg-emerald-50/90 border-emerald-300 text-emerald-600';
    if (isCity) return 'bg-sky-50/90 border-sky-300 text-sky-600';
    if (isAward) return 'bg-yellow-50/90 border-yellow-400 text-yellow-600';
    if (isVirtual) return 'bg-orange-50/90 border-orange-300 text-orange-600';
    return 'bg-slate-50/90 border-slate-300 text-slate-600';
  };

  const getTypeIcon = (size = 18) => {
    if (isInternationalComp)
      return <IntCompIcon size={size} className="text-purple-600 shrink-0" />;
    if (isVirtual) return <ClubIcon size={size} className="text-orange-500 shrink-0" />;
    if (isComp) return <DomesticCompIcon size={size} className="text-amber-500 shrink-0" />;
    if (isClub) return <ClubIcon size={size} className="text-blue-500 shrink-0" />;
    if (isNation) return <NationIcon size={size} className="text-cyan-600 shrink-0" />;
    if (isConfed) return <IntCompIcon size={size} className="text-indigo-500 shrink-0" />;
    if (isStadium) return <StadiumIcon size={size} className="text-emerald-500 shrink-0" />;
    if (isCity) return <CityIcon size={size} className="text-sky-500 shrink-0" />;
    if (isAward) return <AwardIcon size={size} className="text-yellow-500 shrink-0" />;
    if (isPlayer)
      return <UserOutlined style={{ fontSize: size }} className="text-purple-500 shrink-0" />;
    return <AppstoreOutlined style={{ fontSize: size }} className="text-gray-500 shrink-0" />;
  };

  const title = isPlayer
    ? `${currentData.first_name || ''} ${currentData.second_name || ''}`.trim() ||
      currentData.common_name ||
      'Unnamed Player'
    : isVirtual
      ? isVirtualExtinct
        ? 'Extinct Clubs'
        : 'Other Clubs'
      : currentData.name_sh || currentData.name_lg || currentData.name || 'Unnamed';

  const handleCopyId = (e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    if (currentData.id !== undefined && currentData.id !== null) {
      navigator.clipboard.writeText(String(currentData.id));
      setCopied(true);
      message.success(`Copied ${currentData.id}`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const bgInfo = parseColor(currentData.bg_color);
  const fgInfo = parseColor(currentData.fg_color);

  return (
    <div className="w-full max-w-xl mx-auto py-2 space-y-3">
      {/* 1. Header Card (Optional) */}
      {showHeader && (
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-3.5 shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Tooltip title={getTypeLabel()} placement="bottom">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 cursor-default p-0 shadow-2xs border ${getTypeBadgeStyles()}`}
              >
                {getTypeIcon(18)}
              </div>
            </Tooltip>

            <div className="min-w-0 flex-1 flex flex-col justify-center">
              {/* Dòng 1: ID pill with copy */}
              <div className="flex items-center gap-2">
                {currentData.id !== undefined && currentData.id !== null && (
                  <Tooltip title="Click to copy ID" placement="bottom">
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sky-50 hover:bg-sky-100 text-sky-700 hover:text-sky-800 border border-sky-200 font-mono text-xs font-bold transition-all cursor-pointer shadow-2xs select-none"
                    >
                      <span>{currentData.id}</span>
                      {copied ? (
                        <CheckOutlined className="text-emerald-600 text-xs" />
                      ) : (
                        <CopyOutlined className="text-sky-500 text-xs" />
                      )}
                    </button>
                  </Tooltip>
                )}
              </div>

              {/* Dòng 2: uppercase title */}
              <div className="mt-1 min-w-0">
                <div
                  className="font-bold text-xs sm:text-[13px] text-slate-900 uppercase tracking-wide line-clamp-2 break-words block leading-snug"
                  title={title}
                >
                  <span>{title}</span>
                </div>
              </div>
            </div>
          </div>

          {onEdit && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={onEdit}
              className="font-medium px-3.5 h-8 sm:h-9 rounded-lg bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center justify-center gap-1.5 shrink-0"
            >
              <span>Edit</span>
            </Button>
          )}
        </div>
      )}

      {/* 2. Primary Details Card */}
      <div className="bg-sky-50/70 border border-sky-200/80 rounded-xl p-3.5 sm:p-4 shadow-2xs space-y-2.5">
        {isConfed ? (
          <>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
              <span className={getLabelClass('name', 'pt-0.5')}>Name:</span>
              <span
                className="font-bold text-xs sm:text-[13px] text-slate-900 line-clamp-3 break-words text-left"
                title={currentData.name || '-'}
              >
                {currentData.name || '-'}
              </span>
            </div>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
              <span className={getLabelClass('id', 'pt-0.5')}>ID:</span>
              <span className="font-mono font-bold text-xs sm:text-[13px] text-slate-800 break-words text-left">
                {currentData.id || '-'}
              </span>
            </div>
          </>
        ) : (
          <>
            {/* LN */}
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
              <span className={getLabelClass(['name_lg', 'name'], 'pt-0.5')}>LN:</span>
              <span
                className={`font-bold text-xs sm:text-[13px] ${getValueClass(['name_lg', 'name'], 'text-slate-900')} line-clamp-3 break-words text-left`}
                title={isVirtual ? '-' : currentData.name_lg || currentData.name || title}
              >
                {isVirtual ? '-' : currentData.name_lg || currentData.name || title}
              </span>
            </div>

            {/* SN */}
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
              <span className={getLabelClass(['name_sh'], 'pt-0.5')}>SN:</span>
              <span
                className={`font-bold text-xs sm:text-[13px] ${getValueClass(['name_sh'])} line-clamp-3 break-words text-left`}
                title={isVirtual ? '-' : currentData.name_sh || currentData.name || '-'}
              >
                {isVirtual ? '-' : currentData.name_sh || currentData.name || '-'}
              </span>
            </div>

            {/* 6N */}
            {(isClub || currentData.name_6l !== undefined) && (
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
                <span className={getLabelClass(['name_6l'], 'pt-0.5')}>6N:</span>
                <span
                  className={`font-sans font-bold text-xs sm:text-[13px] ${getValueClass(['name_6l'])} break-words text-left`}
                >
                  {currentData.name_6l || '-'}
                </span>
              </div>
            )}

            {/* 3N */}
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
              <span className={getLabelClass(['name_3l', 'code'], 'pt-0.5')}>
                3N:
              </span>
              <span
                className={`font-sans font-bold text-xs sm:text-[13px] ${getValueClass(['name_3l', 'code'])} break-words text-left`}
              >
                {isVirtual ? '-' : currentData.name_3l || nationCode || '-'}
              </span>
            </div>
          </>
        )}

        {/* Confederation (for International Competition or Nation or Comp) */}
        {(isInternationalComp || isNation || (!isClub && !isConfed && (confedId || confedName))) && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
            <span className={getLabelClass(['confed_id', 'confed'], 'pt-0.5')}>
              Confed:
            </span>
            <span
              onClick={() => {
                if (confedId && onNavigateConfed) {
                  onNavigateConfed(String(confedId));
                }
              }}
              className={`font-bold text-xs sm:text-[13px] ${
                confedId && onNavigateConfed
                  ? 'text-blue-600 hover:underline cursor-pointer'
                  : getValueClass(['confed_id', 'confed'])
              } break-words text-left`}
            >
              {confedName || '-'}
            </span>
          </div>
        )}

        {/* Associated Nation */}
        {!isNation && !isInternationalComp && !isConfed && nationId && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
            <span className={getLabelClass(['nation_id', 'country_id', 'nation'], 'pt-0.5')}>
              Nation:
            </span>
            <div
              onClick={() => {
                if (nationId && onNavigateNation) {
                  onNavigateNation(String(nationId));
                }
              }}
              className={`flex items-center gap-1.5 min-w-0 text-left ${
                nationId && onNavigateNation ? 'cursor-pointer group' : ''
              }`}
            >
              {isClub && confedName && (
                <>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (confedId && onNavigateConfed) {
                        onNavigateConfed(String(confedId));
                      }
                    }}
                    className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none ${
                      confedId && onNavigateConfed
                        ? 'cursor-pointer border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                        : `border-slate-200 bg-slate-50 ${getValueClass(['confed_id', 'confed'])}`
                    }`}
                  >
                    {confedName}
                  </button>
                </>
              )}
              {getNationLogoUrl(nationId, nationCode) ? (
                <img
                  src={getNationLogoUrl(nationId, nationCode)}
                  alt={nationName || 'Nation'}
                  className="w-4 h-3 object-cover rounded-2xs border border-slate-200 shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
              <span
                className={`font-bold text-xs sm:text-[13px] ${
                  nationId && onNavigateNation
                    ? 'text-blue-600 group-hover:underline'
                    : getValueClass(['nation_id', 'country_id', 'nation'])
                } truncate`}
              >
                {nationName}
              </span>
            </div>
          </div>
        )}

        {/* League / Competition (for Club) */}
        {isClub && (currentData.comp || currentData.comp_id) && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
            <span className={getLabelClass(['comp_id', 'competition_id', 'comp'], 'pt-0.5')}>
              League:
            </span>
            <div
              onClick={() => {
                const cId = currentData.comp?.id || currentData.comp_id;
                if (cId && onNavigateComp) {
                  onNavigateComp(String(cId));
                }
              }}
              className={`flex items-center gap-1.5 min-w-0 text-left ${
                (currentData.comp?.id || currentData.comp_id) && onNavigateComp
                  ? 'cursor-pointer group'
                  : ''
              }`}
            >
              <span
                className={`font-bold text-xs sm:text-[13px] ${
                  (currentData.comp?.id || currentData.comp_id) && onNavigateComp
                    ? 'text-blue-600 group-hover:underline'
                    : getValueClass(['comp_id', 'comp'])
                } truncate`}
              >
                {currentData.comp?.name_sh ||
                  currentData.comp?.name_lg ||
                  currentData.comp?.name ||
                  (currentData.comp_id ? `Competition ${currentData.comp_id}` : '-')}
              </span>
            </div>
          </div>
        )}

        {/* Region (for City) */}
        {isCity && currentData.region && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
            <span className={getLabelClass('region', 'pt-0.5')}>Region:</span>
            <span
              className={`font-bold text-xs sm:text-[13px] ${getValueClass('region', 'text-sky-800')} break-words text-left`}
            >
              {String(currentData.region).replace(/^\[[^\]]+\]\s*/, '').trim()}
            </span>
          </div>
        )}

        {/* Parent Competition (for Competitions) */}
        {isComp &&
          (currentData.parent_comp ||
            currentData.parent ||
            currentData.parent_id ||
            isFieldInactive(['parent_comp', 'parent_id', 'parent'])) && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
            <span className={getLabelClass(['parent_comp', 'parent_id', 'parent'], 'pt-0.5')}>Parent Comp:</span>
            <span
              onClick={() => {
                const pId = currentData.parent_comp?.id || currentData.parent?.id || currentData.parent_id;
                if (pId && onNavigateParentComp) {
                  onNavigateParentComp(String(pId));
                }
              }}
              className={`font-bold text-xs sm:text-[13px] ${
                (currentData.parent_comp?.id || currentData.parent?.id || currentData.parent_id) && onNavigateParentComp
                  ? 'text-blue-600 hover:underline cursor-pointer'
                  : getValueClass(['parent_comp', 'parent_id', 'parent'])
              } line-clamp-3 break-words text-left`}
            >
              {(() => {
                const p = currentData.parent_comp || currentData.parent;
                if (p) {
                  const pName = p.name_lg || p.name_sh || p.name;
                  const p3l = p.name_3l ? `[${p.name_3l}] ` : '';
                  return `${p3l}${pName || p.id}`;
                }
                return currentData.parent_id ? `${currentData.parent_id}` : '-';
              })()}
            </span>
          </div>
        )}

        {/* Club Affiliate Info */}
        {!hideClubAffiliates && isClub && (currentData.affiliate_club?.id || currentData.affiliate_club?.name_lg || currentData.affiliate_club?.name_sh || currentData.affiliate_club?.type) && (
          <>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
              <span className={getLabelClass(['affiliate_club'], 'pt-0.5')}>
                Affiliate Club:
              </span>
              <div
                onClick={() => {
                  if (currentData.affiliate_club?.id && onNavigateClub) {
                    onNavigateClub(String(currentData.affiliate_club.id));
                  }
                }}
                className={`flex items-center gap-1.5 flex-wrap ${
                  currentData.affiliate_club?.id && onNavigateClub ? 'cursor-pointer group' : ''
                }`}
              >
                <span
                  className={`font-bold text-xs sm:text-[13px] ${
                    currentData.affiliate_club?.id && onNavigateClub
                      ? 'text-blue-600 group-hover:underline'
                      : 'text-slate-800'
                  }`}
                >
                  {currentData.affiliate_club?.name_lg ||
                    currentData.affiliate_club?.name_sh ||
                    currentData.affiliate_club?.name ||
                    `Club #${currentData.affiliate_club?.id}`}
                </span>
              </div>
            </div>
            {currentData.affiliate_club?.type && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
                <span className={getLabelClass(['affiliate_club'], 'pt-0.5')}>
                  Affiliate Type:
                </span>
                <div>
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                    {currentData.affiliate_club.type}
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* First Team Affiliates list */}
        {!hideClubAffiliates && isClub && currentData.affiliates && currentData.affiliates.length > 0 && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
            <span className={getLabelClass(['affiliates'], 'pt-0.5')}>
              Affiliates ({currentData.affiliates.length}):
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {currentData.affiliates.map((aff: any) => {
                const affT = aff.affiliate_club?.type;
                return (
                  <span
                    key={aff.id}
                    onClick={() => {
                      if (aff.id && onNavigateClub) {
                        onNavigateClub(String(aff.id));
                      }
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200 ${
                      onNavigateClub ? 'cursor-pointer hover:bg-slate-200' : ''
                    }`}
                  >
                    {affT && <span className="font-semibold text-sky-700">[{affT}]</span>}
                    <span className={onNavigateClub ? 'hover:underline text-blue-600 font-semibold' : ''}>
                      {aff.name_sh || aff.name_lg || aff.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">({aff.id})</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Total Competitions for Nation */}
        {(currentData.totalComps !== undefined || counts?.domesticComps !== undefined) && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
            <span className={getLabelClass('competitions', 'pt-0.5')}>Competitions:</span>
            <span
              onClick={() => onSwitchTab?.('DOMESTIC_COMPS')}
              className={`font-bold text-xs sm:text-[13px] text-amber-700 text-left ${
                onSwitchTab ? 'cursor-pointer hover:underline' : ''
              }`}
            >
              {counts?.domesticComps ?? currentData.totalComps ?? 0}
              {currentData.stats?.comps?.total !== undefined && (
                <span className="font-normal text-slate-500">
                  {' '}(total: {currentData.stats.comps.total})
                </span>
              )}
            </span>
          </div>
        )}

        {/* Stadiums for Nation */}
        {counts?.stadiums !== undefined && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
            <span className={getLabelClass('stadiums', 'pt-0.5')}>Stadiums:</span>
            <span
              onClick={() => onSwitchTab?.('STADIUMS')}
              className={`font-bold text-xs sm:text-[13px] text-emerald-700 text-left ${
                onSwitchTab ? 'cursor-pointer hover:underline' : ''
              }`}
            >
              {counts.stadiums}
            </span>
          </div>
        )}

        {/* Cities for Nation */}
        {counts?.cities !== undefined && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
            <span className={getLabelClass('cities', 'pt-0.5')}>Cities:</span>
            <span
              onClick={() => onSwitchTab?.('CITIES')}
              className={`font-bold text-xs sm:text-[13px] text-sky-700 text-left ${
                onSwitchTab ? 'cursor-pointer hover:underline' : ''
              }`}
            >
              {counts.cities}
            </span>
          </div>
        )}

        {/* Total Nations (Confed) */}
        {(currentData.totalNations !== undefined || counts?.totalNations !== undefined) && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
            <span className={getLabelClass('nations', 'pt-0.5')}>Nations:</span>
            <span
              onClick={() => onSwitchTab?.('NATIONS')}
              className={`font-bold text-xs sm:text-[13px] text-cyan-700 text-left ${
                onSwitchTab ? 'cursor-pointer hover:underline' : ''
              }`}
            >
              {counts?.totalNations ?? currentData.totalNations ?? 0}
            </span>
          </div>
        )}

        {/* Total International Competitions (Confed) */}
        {(currentData.totalIntComps !== undefined || counts?.totalIntComps !== undefined) && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
            <span className={getLabelClass(['int_competitions', 'int_comps'], 'pt-0.5')}>
              Int Comps:
            </span>
            <span
              onClick={() => onSwitchTab?.('INT_COMPETITIONS')}
              className={`font-bold text-xs sm:text-[13px] text-purple-700 text-left ${
                onSwitchTab ? 'cursor-pointer hover:underline' : ''
              }`}
            >
              {counts?.totalIntComps ?? currentData.totalIntComps ?? 0}
            </span>
          </div>
        )}

        {/* Type / Categories */}
        {(currentData.type || currentData.categories) && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90 last:border-b-0 last:pb-0">
            <span className={getLabelClass(['type', 'categories', 'category'], 'pt-0.5')}>
              Type:
            </span>
            <div className="flex items-center gap-1 flex-wrap text-left">
              {String(currentData.type || currentData.categories)
                .split(',')
                .map((cat: string, idx: number) => (
                  <Tag color="cyan" key={idx} className="m-0 text-xs font-medium">
                    {cat.trim()}
                  </Tag>
                ))}
            </div>
          </div>
        )}

        {/* BG Color Row */}
        {bgInfo && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90 last:border-b-0 last:pb-0">
            <span
              className={getLabelClass(['bg_color', 'background_color'], 'pt-0.5')}
              title="Background Color"
            >
              BG:
            </span>
            <div className="flex items-center gap-2 min-w-0 text-left">
              <Tooltip title={`Hex: ${bgInfo.hex}`}>
                <span
                  className="inline-block w-4 h-4 rounded border border-black/20 shadow-2xs shrink-0 cursor-pointer"
                  style={{ backgroundColor: bgInfo.css }}
                />
              </Tooltip>
              <span
                className={`font-mono font-bold text-xs sm:text-[13px] ${getValueClass(['bg_color', 'background_color'])}`}
              >
                {currentData.bg_color}
              </span>
            </div>
          </div>
        )}

        {/* FG Color Row */}
        {fgInfo && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90 last:border-b-0 last:pb-0">
            <span
              className={getLabelClass(['fg_color', 'foreground_color'], 'pt-0.5')}
              title="Foreground Color"
            >
              FG:
            </span>
            <div className="flex items-center gap-2 min-w-0 text-left">
              <Tooltip title={`Hex: ${fgInfo.hex}`}>
                <span
                  className="inline-block w-4 h-4 rounded border border-black/20 shadow-2xs shrink-0 cursor-pointer"
                  style={{ backgroundColor: fgInfo.css }}
                />
              </Tooltip>
              <span
                className={`font-mono font-bold text-xs sm:text-[13px] ${getValueClass(['fg_color', 'foreground_color'])}`}
              >
                {currentData.fg_color}
              </span>
            </div>
          </div>
        )}

        {/* Clubs Count - Hidden for International Competitions */}
        {!isInternationalComp &&
          (statsClubCount ?? currentData.clubsCount) !== undefined && (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
              <span className={getLabelClass(['clubs', 'club_id'], 'pt-0.5')}>Clubs:</span>
              <span
                onClick={() => onSwitchTab?.('CLUBS')}
                className={`font-bold text-xs sm:text-[13px] text-blue-700 text-left ${
                  onSwitchTab ? 'cursor-pointer hover:underline' : ''
                }`}
              >
                {statsClubCount ?? currentData.clubsCount}
              </span>
            </div>
          )}

        {/* Awards Count */}
        {(currentData.stats?.award !== undefined ||
          currentData.awardsCount !== undefined ||
          counts?.awards !== undefined) && (
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90 last:border-b-0 last:pb-0">
            <span className={getLabelClass('awards', 'pt-0.5')}>Awards:</span>
            <span
              onClick={() => onSwitchTab?.('AWARDS')}
              className={`font-bold text-xs sm:text-[13px] text-yellow-700 text-left ${
                onSwitchTab ? 'cursor-pointer hover:underline' : ''
              }`}
            >
              {counts?.awards ?? currentData.stats?.award ?? currentData.awardsCount ?? 0}
            </span>
          </div>
        )}

      </div>

      {/* 3. Scope & Status Badges */}
      {(currentData.is_extinct || isVirtual || currentData.is_disabled) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {currentData.is_disabled && (
            <Tag color="red" className="m-0 text-xs font-medium py-0.5 px-2">
              Disabled in .lnc
            </Tag>
          )}
          {currentData.is_extinct && (
            <Tag color="red" className="m-0 text-xs font-medium py-0.5 px-2">
              Extinct Club
            </Tag>
          )}
          {isVirtual && (
            <Tag color="orange" className="m-0 text-xs font-medium py-0.5 px-2">
              {isVirtualExtinct
                ? 'Extinct Clubs Container'
                : 'Independent Clubs Container'}
            </Tag>
          )}
        </div>
      )}

      {/* 4. Notes Card */}
      {currentData.note && (
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-700">
          <InfoCircleOutlined className="text-sky-500 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="font-bold text-slate-800 block mb-0.5">Note:</span>
            <p className="italic text-slate-600 break-words m-0">{currentData.note}</p>
          </div>
        </div>
      )}
    </div>
  );
}
