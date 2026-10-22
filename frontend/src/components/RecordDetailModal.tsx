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

  // Nation resolving: If it's a nation, data.id is the nation id
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
      width={600}
      destroyOnClose
      centered
      title={
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 pr-6">
          {/* Main Flag or Logo / Icon */}
          {isNation && nationId ? (
            <img
              src={getNationLogoUrl(nationId, nationCode)}
              alt={title}
              className="w-12 h-8 object-cover rounded shadow-xs border border-slate-200/90 bg-white shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : isConfed ? (
            <img
              src={getConfederationLogoUrl(data.id)}
              alt={data.name || 'Confederation'}
              className="w-9 h-9 object-contain rounded-lg p-1 bg-white shadow-xs border border-slate-200 shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 border ${
                isComp
                  ? 'bg-amber-50 border-amber-200/70 text-amber-600'
                  : isClub
                  ? 'bg-blue-50 border-blue-200/70 text-blue-600'
                  : isPlayer
                  ? 'bg-purple-50 border-purple-200/70 text-purple-600'
                  : 'bg-slate-100 border border-slate-200 text-slate-700'
              }`}
            >
              {getTypeIcon()}
            </div>
          )}

          {/* Title and Header Badges */}
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-base text-slate-900 truncate m-0 leading-tight">
              {title}
            </h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {/* FM ID 1-Click Copy Badge */}
              <button
                type="button"
                onClick={handleCopyId}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer group"
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
                <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {nationCode}
                </span>
              )}
            </div>
          </div>
        </div>
      }
    >
      <div className="py-2.5 space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        {/* Fields List formatted strictly as: [label]: [Value] */}
        <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-3.5 space-y-2">
          {/* ID */}
          <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
            <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
              ID:
            </span>
            <div className="flex items-center gap-1.5 font-mono font-bold text-sm text-blue-600 min-w-0">
              <span>{data.id}</span>
              <Tooltip title="Copy ID">
                <Button
                  type="text"
                  size="small"
                  shape="circle"
                  icon={copied ? <CheckOutlined className="text-emerald-600 text-xs" /> : <CopyOutlined className="text-slate-400 text-xs" />}
                  onClick={handleCopyId}
                  className="hover:bg-slate-200"
                />
              </Tooltip>
            </div>
          </div>

          {/* Type */}
          <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
            <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
              Type:
            </span>
            <div className="flex items-center gap-1.5 min-w-0">
              <Tag color={getTypeColor()} className="m-0 font-semibold text-xs">
                {getTypeLabel()}
              </Tag>
            </div>
          </div>

          {/* Names block: [label]: [Value] */}
          {isPlayer ? (
            <>
              {/* FN */}
              <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
                <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                  FN:
                </span>
                <span className="font-bold text-[13px] text-slate-800 break-words flex-1">
                  {data.first_name || '-'}
                </span>
              </div>

              {/* SN */}
              <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
                <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                  SN:
                </span>
                <span className="font-bold text-[13px] text-slate-800 break-words flex-1">
                  {data.second_name || '-'}
                </span>
              </div>

              {/* CN */}
              {data.common_name && (
                <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
                  <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                    CN:
                  </span>
                  <span className="font-bold text-[13px] text-purple-700 italic break-words flex-1">
                    {data.common_name}
                  </span>
                </div>
              )}
            </>
          ) : isCity || isStadium ? (
            <>
              <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
                <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                  Name:
                </span>
                <span className="font-bold text-[13px] text-slate-800 break-words flex-1">
                  {data.name || data.long_name || '-'}
                </span>
              </div>
            </>
          ) : (
            <>
              {/* LN */}
              <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
                <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                  LN:
                </span>
                <div className="flex items-center justify-between gap-2 flex-1 min-w-0">
                  <span
                    className={`font-bold text-[13px] break-words ${
                      isFieldInactive('long_name') ? 'line-through text-red-600' : 'text-slate-900'
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

              {/* SN */}
              <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
                <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                  SN:
                </span>
                <div className="flex items-center justify-between gap-2 flex-1 min-w-0">
                  <span
                    className={`font-bold text-[13px] break-words ${
                      isFieldInactive('short_name') ? 'line-through text-red-600' : 'text-slate-800'
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

              {/* 3N */}
              <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
                <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                  3N:
                </span>
                <div className="flex items-center justify-between gap-2 flex-1 min-w-0">
                  <span
                    className={`font-mono font-bold text-[13px] ${
                      isFieldInactive('three_letter_name')
                        ? 'line-through text-red-600'
                        : 'text-slate-800'
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

              {/* 6N */}
              {(type === 'club' ||
                type === EntityType.CLUB ||
                data.six_letter_name !== undefined) && (
                <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
                  <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                    6N:
                  </span>
                  <div className="flex items-center justify-between gap-2 flex-1 min-w-0">
                    <span
                      className={`font-mono font-bold text-[13px] ${
                        isFieldInactive('six_letter_name')
                          ? 'line-through text-red-600'
                          : 'text-slate-800'
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

          {/* Associated Nation: [label]: [Value] */}
          {!isNation && nationId && (
            <div className="flex items-center gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
              <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                Nation:
              </span>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <img
                  src={getNationLogoUrl(nationId, nationCode)}
                  alt={nationName || 'Nation'}
                  className="w-5 h-3.5 object-cover rounded-2xs border border-slate-300 shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span className="font-bold text-[13px] text-slate-800 truncate">
                  {nationName}
                </span>
                {nationCode && (
                  <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                    {nationCode}
                  </span>
                )}
                <span className="text-xs text-slate-400 font-mono ml-auto shrink-0">
                  ID: {nationId}
                </span>
              </div>
            </div>
          )}

          {/* Assigned Competition: [label]: [Value] */}
          {data.comp_id && (
            <div className="flex items-center gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
              <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                League:
              </span>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <TrophyOutlined className="text-amber-500 text-xs shrink-0" />
                <span className="font-bold text-[13px] text-slate-800 truncate">
                  {data.competition?.long_name || data.comp_name || `Competition ${data.comp_id}`}
                </span>
                <span className="text-xs text-slate-400 font-mono ml-auto shrink-0">
                  ID: {data.comp_id}
                </span>
              </div>
            </div>
          )}

          {/* Counts: [label]: [Value] */}
          {/* Total Competitions for Nation */}
          {data.totalComps !== undefined && (
            <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
              <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                Comps:
              </span>
              <span className="font-bold text-[13px] text-amber-700">
                {data.totalComps} Competitions
              </span>
            </div>
          )}

          {/* Clubs Count for Competition */}
          {data.clubsCount !== undefined && (
            <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
              <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                Clubs:
              </span>
              <span className="font-bold text-[13px] text-blue-700">
                {data.clubsCount} Clubs
              </span>
            </div>
          )}

          {/* Awards Count for Competition */}
          {data.awardsCount !== undefined && (
            <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
              <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                Awards:
              </span>
              <span className="font-bold text-[13px] text-amber-700">
                {data.awardsCount} Awards
              </span>
            </div>
          )}

          {/* Total Nations for Confederation */}
          {data.totalNations !== undefined && (
            <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
              <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                Nations:
              </span>
              <span className="font-bold text-[13px] text-cyan-700">
                {data.totalNations} Member Nations
              </span>
            </div>
          )}

          {/* Fallback Total Children */}
          {data.totalComps === undefined &&
            data.clubsCount === undefined &&
            data.totalNations === undefined &&
            data.totalChildren !== undefined &&
            data.totalChildren > 0 && (
              <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
                <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                  Children:
                </span>
                <span className="font-bold text-[13px] text-slate-800">
                  {data.totalChildren}
                </span>
              </div>
            )}

          {/* Colors: [label]: [Value] */}
          {(bgInfo || fgInfo) && (
            <div className="flex items-center gap-2 min-w-0 pb-1.5 border-b border-slate-200/60 flex-wrap">
              <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                Colors:
              </span>
              <div className="flex items-center gap-2 flex-wrap flex-1">
                {/* Sample badge */}
                <span
                  className="px-2 py-0.5 rounded text-xs font-bold border border-black/15 shadow-2xs"
                  style={{
                    backgroundColor: bgInfo ? bgInfo.css : '#ffffff',
                    color: fgInfo ? fgInfo.css : '#000000',
                  }}
                >
                  Sample
                </span>

                {/* BG */}
                {bgInfo && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    <span
                      className="w-3.5 h-3.5 rounded border border-black/20 shrink-0"
                      style={{ backgroundColor: bgInfo.css }}
                    />
                    <span className="text-slate-400">BG:</span>
                    <span className="font-mono font-bold text-slate-800">{bgInfo.hex}</span>
                    <span className="text-slate-400 font-mono text-[11px]">({data.bg_color})</span>
                  </span>
                )}

                {/* FG */}
                {fgInfo && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    <span
                      className="w-3.5 h-3.5 rounded border border-black/20 shrink-0"
                      style={{ backgroundColor: fgInfo.css }}
                    />
                    <span className="text-slate-400">FG:</span>
                    <span className="font-mono font-bold text-slate-800">{fgInfo.hex}</span>
                    <span className="text-slate-400 font-mono text-[11px]">({data.fg_color})</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Scope / Status: [label]: [Value] */}
          {(data.is_international !== undefined || data.is_extinct !== undefined || isVirtual) && (
            <div className="flex items-center gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
              <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                Status:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap flex-1">
                {data.is_international && (
                  <Tag color="purple" className="m-0 text-xs font-medium">
                    International Competition
                  </Tag>
                )}
                {data.is_extinct && (
                  <Tag color="red" className="m-0 text-xs font-medium">
                    Extinct Club
                  </Tag>
                )}
                {isVirtual && (
                  <Tag color="orange" className="m-0 text-xs font-medium">
                    {data.virtual_type === 'EXTINCT' ? 'Extinct Clubs Container' : 'Independent Clubs Container'}
                  </Tag>
                )}
              </div>
            </div>
          )}

          {/* Categories: [label]: [Value] */}
          {data.categories && (
            <div className="flex items-center gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
              <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                {isCity ? 'Region:' : 'Category:'}
              </span>
              <div className="flex items-center gap-1 flex-wrap flex-1">
                {String(data.categories)
                  .split(',')
                  .map((cat: string, idx: number) => (
                    <Tag color="cyan" key={idx} className="m-0 text-xs font-medium">
                      {cat.trim()}
                    </Tag>
                  ))}
              </div>
            </div>
          )}

          {/* Note: [label]: [Value] */}
          {data.note && (
            <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60 last:border-b-0">
              <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                Note:
              </span>
              <span className="text-xs text-slate-700 italic flex-1 break-words">
                {data.note}
              </span>
            </div>
          )}

          {/* Inactive Fields: [label]: [Value] */}
          {inactiveList.length > 0 && (
            <div className="flex items-center gap-2 min-w-0 last:border-b-0">
              <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                Inactive:
              </span>
              <div className="flex items-center gap-1 flex-wrap flex-1">
                {inactiveList.map((f: string, i: number) => (
                  <Tag color="error" key={i} className="m-0 text-xs">
                    {f}
                  </Tag>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
