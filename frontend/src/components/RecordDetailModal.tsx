'use client';

import React, { useState } from 'react';
import { Modal, Tag, Button, Tooltip, message } from 'antd';
import {
  CopyOutlined,
  CheckOutlined,
  EditOutlined,
  TrophyOutlined,
  SafetyOutlined,
  BankOutlined,
  EnvironmentOutlined,
  StarOutlined,
  UserOutlined,
  FlagOutlined,
  InfoCircleOutlined,
  GlobalOutlined,
  AppstoreOutlined,
  CodeOutlined,
  IdcardOutlined,
  DownOutlined,
  UpOutlined,
  BgColorsOutlined,
} from '@ant-design/icons';
import { EntityType } from '../types';
import { getConfederationLogoUrl, getNationLogoUrl } from '../services/api';

interface RecordDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  type: EntityType | string;
  onEdit?: () => void;
}

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

export default function RecordDetailModal({
  isOpen,
  onClose,
  data,
  type,
  onEdit,
}: RecordDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [showJson, setShowJson] = useState(false);

  if (!data) return null;

  const bgInfo = parseColor(data.bg_color);
  const fgInfo = parseColor(data.fg_color);

  const handleCopyId = (e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    if (data.id !== undefined && data.id !== null) {
      navigator.clipboard.writeText(String(data.id));
      setCopied(true);
      message.success(`Copied ID: ${data.id}`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyJson = (e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedJson(true);
    message.success('Copied JSON to clipboard');
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const inactiveList = (data.inactive_fields || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);

  const isFieldInactive = (field: string) => inactiveList.includes(field.toLowerCase());

  // Determine Type Flags
  const isPlayer = type === 'player' || type === EntityType.PLAYER;
  const isCity = type === 'city' || type === EntityType.CITY;
  const isStadium = type === 'stadium' || type === EntityType.STADIUM;
  const isComp = type === 'competition' || type === EntityType.COMPETITION;
  const isClub = type === 'club' || type === EntityType.CLUB;
  const isNation = type === 'nation' || type === EntityType.NATION;
  const isConfed = type === 'confederation' || type === EntityType.CONFEDERATION;
  const isStage = type === 'stage' || type === EntityType.STAGE;
  const isVirtual = Boolean(data.is_virtual || data.id === '[EXTINCT]' || data.id === '[OTHER]');

  const title = isPlayer
    ? `${data.first_name || ''} ${data.second_name || ''}`.trim() || data.common_name || 'Unnamed Player'
    : isVirtual
    ? data.virtual_type === 'EXTINCT' || data.id === '[EXTINCT]'
      ? 'Extinct Clubs'
      : 'Other Clubs'
    : data.long_name || data.name || 'Unnamed';

  const getTypeLabel = () => {
    if (isVirtual) return 'Virtual Group';
    switch (type) {
      case 'competition':
      case EntityType.COMPETITION:
        return 'Competition';
      case 'club':
      case EntityType.CLUB:
        return 'Club';
      case 'nation':
      case EntityType.NATION:
        return 'Nation';
      case 'confederation':
      case EntityType.CONFEDERATION:
        return 'Confederation';
      case 'stadium':
      case EntityType.STADIUM:
        return 'Stadium';
      case 'city':
      case EntityType.CITY:
        return 'City';
      case 'award':
      case EntityType.AWARD:
        return 'Award';
      case 'player':
      case EntityType.PLAYER:
        return 'Person / Player';
      case 'stage':
      case EntityType.STAGE:
        return 'Stage';
      default:
        return String(type).toUpperCase();
    }
  };

  const getTypeColor = () => {
    if (isVirtual) return data.virtual_type === 'EXTINCT' || data.id === '[EXTINCT]' ? 'volcano' : 'geekblue';
    if (isComp) return 'gold';
    if (isClub) return 'blue';
    if (isNation) return 'cyan';
    if (isPlayer) return 'purple';
    if (isStadium) return 'green';
    if (isCity) return 'geekblue';
    if (type === 'award' || type === EntityType.AWARD) return 'warning';
    return 'default';
  };

  const getTypeIcon = () => {
    if (isVirtual) return <SafetyOutlined className="text-orange-500" />;
    if (isComp) return <TrophyOutlined className="text-amber-500" />;
    if (isClub) return <SafetyOutlined className="text-blue-500" />;
    if (isNation) return <FlagOutlined className="text-cyan-600" />;
    if (isConfed) return <GlobalOutlined className="text-indigo-500" />;
    if (isStadium) return <BankOutlined className="text-emerald-500" />;
    if (isCity) return <EnvironmentOutlined className="text-indigo-500" />;
    if (type === 'award' || type === EntityType.AWARD) return <StarOutlined className="text-yellow-500" />;
    if (isPlayer) return <UserOutlined className="text-purple-500" />;
    return <AppstoreOutlined className="text-gray-500" />;
  };

  // Nation resolving: If it's a nation, data.id is the nation id!
  const nationId = isNation ? data.id : (data.nation_id || data.country_id || data.nation?.id);
  const nationName = isNation ? (data.long_name || data.name) : (data.nation_name || data.nation?.long_name || data.nation?.name);
  const nationCode = isNation ? (data.three_letter_name || data.code) : (data.nation_three_letter || data.nation?.three_letter_name);

  return (
    <Modal
      open={isOpen}
      onCancel={(e) => {
        e?.stopPropagation?.();
        onClose();
      }}
      modalRender={(modal) => (
        <div onClick={(e) => e.stopPropagation()}>
          {modal}
        </div>
      )}
      footer={[
        onEdit && !isVirtual && (
          <Button
            key="edit"
            type="primary"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              onEdit();
            }}
            className="font-medium px-4 h-9 shadow-sm"
          >
            Edit Record
          </Button>
        ),
        <Button
          key="close"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="font-medium px-4 h-9"
        >
          Close
        </Button>,
      ]}
      width={640}
      destroyOnClose
      centered
      title={
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 pr-6">
          {/* Main Flag or Logo / Icon */}
          {isNation && nationId ? (
            <img
              src={getNationLogoUrl(nationId, nationCode)}
              alt={title}
              className="w-13 h-8.5 object-cover rounded-md shadow-xs border border-slate-200/90 bg-white shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : isConfed ? (
            <img
              src={getConfederationLogoUrl(data.id)}
              alt={data.name || 'Confederation'}
              className="w-10 h-10 object-contain rounded-lg p-1 bg-white shadow-xs border border-slate-200 shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border ${
                isComp
                  ? 'bg-amber-50 border-amber-200/70 text-amber-600'
                  : isClub
                  ? 'bg-blue-50 border-blue-200/70 text-blue-600'
                  : isPlayer
                  ? 'bg-purple-50 border-purple-200/70 text-purple-600'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              {getTypeIcon()}
            </div>
          )}

          {/* Title and Badges */}
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-lg text-slate-900 truncate m-0 leading-tight">
              {title}
            </h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {/* FM ID 1-Click Copy Badge */}
              <button
                type="button"
                onClick={handleCopyId}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer group"
                title="Click to copy FM ID"
              >
                <span className="text-blue-400 font-medium">ID:</span>
                <span>{data.id}</span>
                {copied ? (
                  <CheckOutlined className="text-emerald-600 text-[11px]" />
                ) : (
                  <CopyOutlined className="text-blue-400 group-hover:text-blue-600 text-[11px]" />
                )}
              </button>

              {/* Type Badge */}
              <Tag color={getTypeColor()} className="m-0 font-semibold text-xs border-0">
                {getTypeLabel()}
              </Tag>

              {/* 3-Letter Code Badge */}
              {nationCode && (
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {nationCode}
                </span>
              )}

              {data.is_international && (
                <Tag color="purple" className="m-0 text-xs font-medium">
                  International
                </Tag>
              )}

              {(data.is_extinct || data.virtual_type === 'EXTINCT') && (
                <Tag color="red" className="m-0 text-xs font-medium">
                  Extinct
                </Tag>
              )}
            </div>
          </div>
        </div>
      }
    >
      <div className="py-2.5 space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
        {/* Metric Highlight Tiles (if stats exist) */}
        {(data.totalComps !== undefined ||
          data.clubsCount !== undefined ||
          data.awardsCount !== undefined ||
          data.totalNations !== undefined ||
          (data.totalChildren !== undefined && data.totalChildren > 0)) && (
          <div className="grid grid-cols-2 gap-2.5">
            {/* Nation's Total Competitions */}
            {data.totalComps !== undefined && (
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/40 border border-amber-200/80 rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center text-base shadow-xs shrink-0">
                  <TrophyOutlined />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    Competitions in Nation
                  </div>
                  <div className="text-base font-black text-amber-950">
                    {data.totalComps} Competitions
                  </div>
                </div>
              </div>
            )}

            {/* Confederation's Total Nations */}
            {data.totalNations !== undefined && (
              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100/40 border border-cyan-200/80 rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-600 text-white flex items-center justify-center text-base shadow-xs shrink-0">
                  <FlagOutlined />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-700">
                    Member Nations
                  </div>
                  <div className="text-base font-black text-cyan-950">
                    {data.totalNations} Nations
                  </div>
                </div>
              </div>
            )}

            {/* Competition's Clubs Count */}
            {data.clubsCount !== undefined && (
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/40 border border-blue-200/80 rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500 text-white flex items-center justify-center text-base shadow-xs shrink-0">
                  <SafetyOutlined />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                    Participating Clubs
                  </div>
                  <div className="text-base font-black text-blue-950">
                    {data.clubsCount} Clubs
                  </div>
                </div>
              </div>
            )}

            {/* Competition's Awards Count */}
            {data.awardsCount !== undefined && (
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/40 border border-amber-200/80 rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center text-base shadow-xs shrink-0">
                  <StarOutlined />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    Associated Awards
                  </div>
                  <div className="text-base font-black text-amber-950">
                    {data.awardsCount} Awards
                  </div>
                </div>
              </div>
            )}

            {/* Fallback Total Children for other types */}
            {data.totalComps === undefined &&
              data.clubsCount === undefined &&
              data.totalNations === undefined &&
              data.totalChildren !== undefined &&
              data.totalChildren > 0 && (
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-700 text-white flex items-center justify-center text-base shadow-xs shrink-0">
                    <AppstoreOutlined />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Sub-Records
                    </div>
                    <div className="text-base font-black text-slate-800">
                      {data.totalChildren}
                    </div>
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Associated Hierarchy Banner (For non-nations that belong to a nation) */}
        {!isNation && nationId && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-3">
              <img
                src={getNationLogoUrl(nationId, nationCode)}
                alt={nationName || 'Nation'}
                className="w-9 h-6 object-cover rounded shadow-2xs border border-slate-300 shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Associated Nation
                </div>
                <div className="text-xs font-bold text-slate-800">
                  {nationName}{' '}
                  {nationCode && (
                    <span className="font-mono text-slate-500 font-normal">({nationCode})</span>
                  )}
                </div>
              </div>
            </div>
            <span className="text-xs font-mono font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
              ID: {nationId}
            </span>
          </div>
        )}

        {/* Associated Competition for Clubs */}
        {data.comp_id && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold shrink-0">
                <TrophyOutlined />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Assigned Competition
                </div>
                <div className="text-xs font-bold text-slate-800">
                  {data.competition?.long_name || data.comp_name || `Competition ID: ${data.comp_id}`}
                </div>
              </div>
            </div>
            <span className="text-xs font-mono font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
              ID: {data.comp_id}
            </span>
          </div>
        )}

        {/* Names & Identification Cards */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <IdcardOutlined className="text-blue-500 text-xs" />
            <span>Names & Identifiers</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {isPlayer ? (
              <>
                <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    First Name (FN)
                  </div>
                  <div className="text-sm font-bold text-slate-900">{data.first_name || '-'}</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    Second Name (SN)
                  </div>
                  <div className="text-sm font-bold text-slate-900">{data.second_name || '-'}</div>
                </div>

                {data.common_name && (
                  <div className="sm:col-span-2 bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                      Common Name (CN)
                    </div>
                    <div className="text-sm font-bold text-purple-700 italic">
                      {data.common_name}
                    </div>
                  </div>
                )}
              </>
            ) : isCity || isStadium ? (
              <>
                <div className="sm:col-span-2 bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    Name
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {data.name || data.long_name || '-'}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Long Name (LN) */}
                <div className="sm:col-span-2 bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    Long Name (LN)
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-sm font-bold ${
                        isFieldInactive('long_name') ? 'line-through text-red-500' : 'text-slate-900'
                      }`}
                    >
                      {data.is_virtual ? '-' : (data.long_name || data.name || title)}
                    </span>
                    {isFieldInactive('long_name') && (
                      <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 shrink-0">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                {/* Short Name (SN) */}
                <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    Short Name (SN)
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-sm font-bold ${
                        isFieldInactive('short_name') ? 'line-through text-red-500' : 'text-slate-900'
                      }`}
                    >
                      {data.is_virtual ? '-' : (data.short_name || '-')}
                    </span>
                    {isFieldInactive('short_name') && (
                      <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 shrink-0">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                {/* 3-Letter Code (3N) */}
                <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    3-Letter Code (3N)
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-mono text-sm font-bold ${
                        isFieldInactive('three_letter_name')
                          ? 'line-through text-red-500'
                          : 'text-slate-900'
                      }`}
                    >
                      {data.is_virtual ? '-' : (data.three_letter_name || nationCode || '-')}
                    </span>
                    {isFieldInactive('three_letter_name') && (
                      <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 shrink-0">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                {/* 6-Letter Code (6N) */}
                {(type === 'club' ||
                  type === EntityType.CLUB ||
                  data.six_letter_name !== undefined) && (
                  <div className="sm:col-span-2 bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                      6-Letter Code (6N)
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`font-mono text-sm font-bold ${
                          isFieldInactive('six_letter_name')
                            ? 'line-through text-red-500'
                            : 'text-slate-900'
                        }`}
                      >
                        {data.six_letter_name || '-'}
                      </span>
                      {isFieldInactive('six_letter_name') && (
                        <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 shrink-0">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Color Preview Block for Competitions / Clubs */}
        {(bgInfo || fgInfo) && (
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <BgColorsOutlined className="text-indigo-500 text-xs" />
              <span>Color Configuration</span>
            </div>

            <div className="flex items-center gap-3.5 flex-wrap">
              {/* Visual preview badge */}
              <div
                className="px-4 py-2 rounded-lg font-bold text-xs border border-black/15 shadow-2xs tracking-wide"
                style={{
                  backgroundColor: bgInfo ? bgInfo.css : '#ffffff',
                  color: fgInfo ? fgInfo.css : '#000000',
                }}
              >
                SAMPLE TEXT PREVIEW
              </div>

              {/* Background color chip */}
              {bgInfo && (
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
                  <span
                    className="w-4 h-4 rounded border border-black/20 shrink-0 shadow-2xs"
                    style={{ backgroundColor: bgInfo.css }}
                  />
                  <div className="text-xs">
                    <span className="text-slate-400 mr-1.5">BG:</span>
                    <span className="font-mono font-bold text-slate-800">{bgInfo.hex}</span>
                    <span className="text-slate-400 font-mono text-[11px] ml-1.5">
                      ({data.bg_color})
                    </span>
                  </div>
                </div>
              )}

              {/* Foreground color chip */}
              {fgInfo && (
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
                  <span
                    className="w-4 h-4 rounded border border-black/20 shrink-0 shadow-2xs"
                    style={{ backgroundColor: fgInfo.css }}
                  />
                  <div className="text-xs">
                    <span className="text-slate-400 mr-1.5">FG:</span>
                    <span className="font-mono font-bold text-slate-800">{fgInfo.hex}</span>
                    <span className="text-slate-400 font-mono text-[11px] ml-1.5">
                      ({data.fg_color})
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Categories / Scope / Notes */}
        {(data.categories || data.note || inactiveList.length > 0) && (
          <div className="space-y-2.5">
            {/* Categories */}
            {data.categories && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {isCity ? 'Region:' : 'Categories:'}
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {String(data.categories)
                    .split(',')
                    .map((cat: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-200"
                      >
                        {cat.trim()}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Note Callout */}
            {data.note && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
                <InfoCircleOutlined className="text-slate-400 text-sm mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    Note
                  </div>
                  <p className="m-0 leading-relaxed italic">{data.note}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Collapsible Raw JSON Viewer */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowJson(!showJson);
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <CodeOutlined className="text-blue-500 text-sm" />
              <span>Technical Data (Raw JSON)</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-200/80 text-slate-600">
                {Object.keys(data).length} fields
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-[11px]">{showJson ? 'Collapse' : 'Expand'}</span>
              {showJson ? <UpOutlined className="text-[10px]" /> : <DownOutlined className="text-[10px]" />}
            </div>
          </button>

          {showJson && (
            <div className="relative p-3.5 bg-slate-900 text-slate-200 text-xs font-mono max-h-56 overflow-auto border-t border-slate-800">
              <button
                type="button"
                onClick={handleCopyJson}
                className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-sans border border-slate-700 transition cursor-pointer shadow-xs"
              >
                {copiedJson ? (
                  <>
                    <CheckOutlined className="text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <CopyOutlined />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
              <pre className="m-0 pr-20 leading-relaxed font-mono">{JSON.stringify(data, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
