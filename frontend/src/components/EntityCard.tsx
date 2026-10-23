'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, Button, Space, Tooltip, Popconfirm, Badge } from 'antd';
import {
  TrophyOutlined,
  SafetyOutlined,
  BankOutlined,
  EnvironmentOutlined,
  StarOutlined,
  GlobalOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  UserOutlined,
  FlagOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';

import { EntityType } from '../types';
import { getConfederationLogoUrl, getNationLogoUrl } from '../services/api';
import RecordDetailModal from './RecordDetailModal';

export { EntityType };

interface EntityCardProps {
  type: EntityType | string;
  data: any;
  onNavigate?: (step: any) => void;
  onEdit?: (record: any) => void;
  onDelete?: (record: any) => void;
  onViewChildren?: (record: any) => void;
}

const formatCode = (code?: string | null) => {
  if (!code || typeof code !== 'string' || code.trim() === '' || code.trim().toUpperCase() === 'UNK') {
    return null;
  }
  return code.trim();
};

const parseColorInfo = (rgbStr?: string | null) => {
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

export default function EntityCard({
  type,
  data,
  onNavigate,
  onEdit,
  onDelete,
  onViewChildren,
}: EntityCardProps) {
  const router = useRouter();
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');

  // Determine Type Icon and badge styling
  const getIcon = () => {
    if (data.is_virtual) {
      return (
        <span
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
            data.virtual_type === 'EXTINCT'
              ? 'bg-red-50 border border-red-200 text-red-600'
              : 'bg-blue-50 border border-blue-200 text-blue-600'
          }`}
        >
          <SafetyOutlined />
        </span>
      );
    }
    switch (type) {
      case EntityType.CONFEDERATION:
      case 'confederation':
        return (
          <div className="relative w-6 h-6 shrink-0 flex items-center justify-center">
            <img
              src={getConfederationLogoUrl(data.id)}
              alt={data.name || 'Confederation'}
              className="w-6 h-6 object-contain rounded bg-white shadow-2xs border border-slate-200"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <span
              style={{ display: 'none' }}
              className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200 items-center justify-center text-xs font-bold text-blue-700"
            >
              {data.name ? data.name[0] : 'C'}
            </span>
          </div>
        );
      case EntityType.NATION:
      case 'nation':
        return null;
      case EntityType.COMPETITION:
      case 'competition':
        return (
          <span className="w-6 h-6 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-xs text-amber-600">
            <TrophyOutlined />
          </span>
        );
      case EntityType.CLUB:
      case 'club':
        return (
          <span className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-xs text-blue-600">
            <SafetyOutlined />
          </span>
        );
      case EntityType.STADIUM:
      case 'stadium':
        return (
          <span className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xs text-emerald-600">
            <BankOutlined />
          </span>
        );
      case EntityType.CITY:
      case 'city':
        return (
          <span className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-xs text-indigo-600">
            <EnvironmentOutlined />
          </span>
        );
      case EntityType.AWARD:
      case 'award':
        return (
          <span className="w-6 h-6 rounded-full bg-yellow-50 border border-yellow-200 flex items-center justify-center text-xs text-yellow-600">
            <StarOutlined />
          </span>
        );
      case EntityType.PLAYER:
      case 'player':
        return (
          <span className="w-6 h-6 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-xs text-purple-600">
            <UserOutlined />
          </span>
        );
      case EntityType.STAGE:
      case 'stage':
        return (
          <span className="w-6 h-6 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-xs text-rose-600">
            <FlagOutlined />
          </span>
        );
    }
  };

  const code3 = formatCode(data.three_letter_name);
  const code6 = formatCode(data.six_letter_name);
  const title =
    type === EntityType.PLAYER || type === 'player'
      ? `${data.first_name || ''} ${data.second_name || ''}`.trim() || data.common_name || 'Unnamed Player'
      : data.long_name || data.name || 'Unnamed';
  const subtitle =
    type === EntityType.PLAYER || type === 'player'
      ? data.common_name ? `"${data.common_name}"` : 'Person / Player'
      : type === EntityType.STAGE || type === 'stage'
      ? 'Tournament Stage'
      : data.short_name || '';
  const hasThreeLetter = [
    EntityType.NATION,
    EntityType.COMPETITION,
    EntityType.CLUB,
    'nation',
    'competition',
    'club',
  ].includes(type as any) || 'three_letter_name' in data;
  const fgInfo = parseColorInfo(data.fg_color);
  const bgInfo = parseColorInfo(data.bg_color);

  const inactiveList = (data.inactive_fields || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);
  const isInactive = (field: string) => inactiveList.includes(field.toLowerCase());

  const canEdit =
    onEdit &&
    type !== EntityType.CONFEDERATION &&
    type !== EntityType.NATION &&
    type !== 'confederation' &&
    type !== 'nation' &&
    !data.is_virtual;
  const canDelete =
    onDelete &&
    type !== EntityType.CONFEDERATION &&
    type !== EntityType.NATION &&
    type !== 'confederation' &&
    type !== 'nation' &&
    !data.is_virtual;

  const isTitleInactive = isInactive('long_name') || isInactive('name');

  const nationInfo =
    type === EntityType.NATION || type === 'nation'
      ? {
          id: data.id,
          code: data.three_letter_name,
          name: data.long_name || data.short_name || data.name,
        }
      : data.nation
      ? {
          id: data.nation.id,
          code: data.nation.three_letter_name || data.nation_three_letter || data.nation.code,
          name: data.nation.long_name || data.nation.short_name || data.nation.name,
        }
      : data.nation_id || data.country_id
      ? {
          id: data.nation_id || data.country_id,
          code: data.nation_three_letter || data.nation_code,
          name: data.nation_name,
        }
      : null;

  const isNavigable = Boolean(
    onNavigate && (
      data.is_virtual ||
      (type === EntityType.NATION || type === 'nation' ? (data.totalComps || data.totalChildren || 0) > 0 : false) ||
      (type === EntityType.COMPETITION || type === 'competition' ? (data.clubsCount || 0) > 0 || (data.awardsCount || 0) > 0 : false)
    )
  );

  const handleNavigateAction = () => {
    if (isInfoOpen) return;
    if (!onNavigate) return;
    if (data.is_virtual) {
      onNavigate({
        level: 'INDEPENDENT_CLUBS',
        id: data.virtual_type === 'EXTINCT' ? 'extinct' : 'other',
        virtualId: data.id,
        nationId: data.nation_id,
        title: data.long_name || data.short_name,
        metadata: { is_extinct: data.virtual_type === 'EXTINCT', nation_id: data.nation_id },
      });
    } else if (type === EntityType.NATION || type === 'nation') {
      const count = data.totalComps !== undefined ? data.totalComps : data.totalChildren;
      if (onNavigate) {
        onNavigate({
          level: 'NATION_HUB',
          id: data.id,
          title: `[${data.three_letter_name || ''}] ${data.long_name}`,
        });
      } else if (data.id) {
        router.push(`/nation/${data.id}`);
      }
    } else if (type === EntityType.COMPETITION || type === 'competition') {
      if ((data.clubsCount || 0) > 0) {
        onNavigate({
          level: 'CLUBS_IN_COMP',
          id: data.id,
          title: `${data.short_name || data.long_name}`,
        });
      } else if ((data.awardsCount || 0) > 0) {
        onNavigate({
          level: 'COMP_AWARDS',
          id: data.id,
          title: `${data.short_name || data.long_name} - Awards`,
        });
      }
    }
  };

  const renderChildButtons = () => {
    if (type === EntityType.CONFEDERATION || type === 'confederation') {
      const count = data.totalNations || 0;
      if (count <= 0) return null;

      return (
        <Tooltip title={`Nations: ${count}`}>
          <Button
            type="text"
            shape="circle"
            size="small"
            icon={<EyeOutlined style={{ color: '#1677ff', fontSize: 13 }} />}
            onClick={(e) => {
              e.stopPropagation();
              router.push(data.id ? `/nation?confedId=${data.id}` : '/nation');
            }}
          />
        </Tooltip>
      );
    }

    if (type === EntityType.NATION || type === 'nation') {
      const count = data.totalComps !== undefined ? data.totalComps : data.totalChildren;

      return (
        <Tooltip title={`Details`}>
          <Button
            type="text"
            shape="circle"
            size="small"
            icon={<EyeOutlined style={{ color: '#1677ff', fontSize: 13 }} />}
            onClick={(e) => {
              e.stopPropagation();
              if (data.id) {
                router.push(`/nation/${data.id}`);
              } else {
                router.push('/nation');
              }
            }}
          />
        </Tooltip>
      );
    }

    if (type === EntityType.COMPETITION || type === 'competition') {
      const hasClubs = data.is_virtual || (data.clubsCount || 0) > 0;
      const hasAwards = (data.awardsCount || 0) > 0;
      const childrenCnt = data.childrenCount ?? data.children_count ?? 0;
      const hasChildren = childrenCnt > 0;
      if (!hasClubs && !hasAwards && !hasChildren) return null;

      const titleParts: string[] = [];
      if (data.is_virtual || (data.clubsCount || 0) > 0) {
        titleParts.push(`Clubs: ${data.clubsCount || 0}`);
      }
      if (hasAwards) {
        titleParts.push(`Awards: ${data.awardsCount}`);
      }

      return (
        <div className="flex items-center gap-0.5">
          {hasChildren && (
            <Tooltip title={`Sub-Competitions (${childrenCnt})`}>
              <Button
                type="text"
                shape="circle"
                size="small"
                icon={<ApartmentOutlined style={{ color: '#d97706', fontSize: 13 }} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onViewChildren?.(data);
                }}
              />
            </Tooltip>
          )}
          {(hasClubs || hasAwards) && (
            <Tooltip title={titleParts.join(' | ')}>
              <Button
                type="text"
                shape="circle"
                size="small"
                icon={<EyeOutlined style={{ color: '#1677ff', fontSize: 13 }} />}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onNavigate) {
                    handleNavigateAction();
                  } else if (data.id) {
                    router.push(`/comp/${data.id}`);
                  }
                }}
              />
            </Tooltip>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <div
        onClick={(e) => {
          if (isInfoOpen) {
            e.stopPropagation();
            return;
          }
          handleNavigateAction();
        }}
        className={`bg-white border border-gray-200 hover:border-blue-400 rounded-lg p-2.5 sm:p-3.5 shadow-sm hover:shadow-md transition-all duration-150 flex flex-col justify-between group h-full ${
          isNavigable ? 'cursor-pointer' : ''
        }`}
      >
      <div>
        {/* Top Header Bar */}
        <div className="flex items-center justify-between gap-1 pb-2 sm:pb-2.5 mb-2 sm:mb-2.5 border-b border-gray-100">
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-wrap">
            {/* Nation in Header: flag + nation_3letter (before ID) */}
            {nationInfo && (
              <Tooltip title={nationInfo.name || 'Nation'}>
                <div className="flex items-center gap-1 shrink-0 px-1.5 py-0.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-xs text-slate-600 transition-colors">
                  <img
                    src={getNationLogoUrl(nationInfo.id, nationInfo.code)}
                    alt={nationInfo.name || 'Nation'}
                    className="w-4 h-3 object-cover rounded-2xs border border-slate-200 shrink-0 inline-block"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  {nationInfo.code && (
                    <span className="text-[11px] font-semibold text-slate-600">
                      {nationInfo.code}
                    </span>
                  )}
                </div>
              </Tooltip>
            )}

            <Tooltip
              title={
                data.is_virtual || data.id === '[EXTINCT]' || data.id === '[OTHER]'
                  ? data.virtual_type === 'EXTINCT' || data.id === '[EXTINCT]'
                    ? 'Extinct Clubs'
                    : 'Other Clubs (Unassigned)'
                  : undefined
              }
            >
              <Tag
                color={
                  data.is_virtual || data.id === '[EXTINCT]' || data.id === '[OTHER]'
                    ? data.virtual_type === 'EXTINCT' || data.id === '[EXTINCT]'
                      ? 'volcano'
                      : 'geekblue'
                    : 'blue'
                }
                className="font-bold text-xs m-0 shrink-0"
              >
                {data.id}
              </Tag>
            </Tooltip>
            {(bgInfo || fgInfo) && (
              <div className="flex items-center gap-1.5 shrink-0">
                {bgInfo && (
                  <Tooltip
                    title={
                      <div className="text-center font-mono text-xs py-0.5">
                        <div className="font-bold text-sky-300">Background Color</div>
                        <div>{bgInfo.hex}</div>
                        <div>{bgInfo.rgb}</div>
                      </div>
                    }
                  >
                    <span
                      className="inline-block w-4 h-4 rounded border border-black/20 shadow-xs cursor-pointer hover:scale-110 transition-transform"
                      style={{
                        backgroundColor: bgInfo.css,
                      }}
                    />
                  </Tooltip>
                )}

                {fgInfo && (
                  <Tooltip
                    title={
                      <div className="text-center font-mono text-xs py-0.5">
                        <div className="font-bold text-sky-300">Foreground Color</div>
                        <div>{fgInfo.hex}</div>
                        <div>{fgInfo.rgb}</div>
                      </div>
                    }
                  >
                    <span
                      className="inline-block w-4 h-4 rounded border border-black/20 shadow-xs cursor-pointer hover:scale-110 transition-transform"
                      style={{
                        backgroundColor: fgInfo.css,
                      }}
                    />
                  </Tooltip>
                )}
              </div>
            )}
          </div>
          {data.is_extinct && (
            <Tag color="red" className="m-0 text-[10px] font-semibold shrink-0">
              Extinct
            </Tag>
          )}
        </div>

        {/* Fields List formatted as [label]: {value} */}
        <div className="space-y-1 mb-2 text-xs">
          {type === 'player' || type === EntityType.PLAYER ? (
            <>
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="w-8 text-gray-400 font-medium text-xs shrink-0 select-none">FN:</span>
                <span className="font-bold text-[13px] leading-5 truncate text-gray-800">
                  {data.first_name || '-'}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="w-8 text-gray-400 font-medium text-xs shrink-0 select-none">SN:</span>
                <span className="font-bold text-[13px] leading-5 truncate text-gray-800">
                  {data.second_name || '-'}
                </span>
              </div>
              {data.common_name && (
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <span className="w-8 text-gray-400 font-medium text-xs shrink-0 select-none">CN:</span>
                  <span className="font-bold text-[13px] leading-5 truncate text-gray-700 italic">
                    {data.common_name}
                  </span>
                </div>
              )}
            </>
          ) : type === 'city' || type === EntityType.CITY || type === 'stadium' || type === EntityType.STADIUM ? (
            <>
              <div className="flex items-start gap-1.5 min-w-0">
                <span className="w-10 sm:w-12 text-gray-400 font-medium text-xs shrink-0 select-none pt-0.5">Name:</span>
                <span
                  className={`font-bold text-[12.5px] sm:text-[13px] leading-[18px] line-clamp-2 break-words ${
                    isTitleInactive ? 'text-red-600' : 'text-gray-800'
                  }`}
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                  }}
                  title={title}
                >
                  {title}
                </span>
              </div>
              {data.categories && (
                <div className="flex items-start gap-1.5 min-w-0 mt-1">
                  <span className="w-10 sm:w-12 text-gray-400 font-medium text-xs shrink-0 select-none pt-0.5">Region:</span>
                  <span
                    className="font-bold text-[12.5px] sm:text-[13px] leading-[18px] line-clamp-2 break-words text-gray-800"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                    }}
                    title={data.categories}
                  >
                    {data.categories}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              {/* LN */}
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="w-8 text-gray-400 font-medium text-xs shrink-0 select-none">LN:</span>
                <span
                  className={`font-bold text-[13px] leading-5 truncate ${
                    isTitleInactive ? 'text-red-600' : 'text-gray-800'
                  }`}
                >
                  {data.is_virtual ? '-' : (data.long_name || title)}
                </span>
              </div>

              {/* SN */}
              {(hasThreeLetter || data.short_name || data.is_virtual) && (
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <span className="w-8 text-gray-400 font-medium text-xs shrink-0 select-none">SN:</span>
                  <span
                    className={`font-bold text-[13px] leading-5 truncate ${
                      isInactive('short_name') ? 'text-red-600' : 'text-gray-800'
                    }`}
                  >
                    {data.is_virtual ? '-' : (data.short_name || title)}
                  </span>
                </div>
              )}

              {/* 6N */}
              {(type === 'club' || type === EntityType.CLUB || data.six_letter_name) && (
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <span className="w-8 text-gray-400 font-medium text-xs shrink-0 select-none">6N:</span>
                  <span
                    className={`font-bold text-[13px] leading-5 truncate ${
                      isInactive('six_letter_name') ? 'text-red-600' : 'text-gray-800'
                    }`}
                  >
                    {code6 || '-'}
                  </span>
                </div>
              )}

              {/* 3N */}
              {(hasThreeLetter || data.three_letter_name || data.is_virtual) && (
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <span className="w-8 text-gray-400 font-medium text-xs shrink-0 select-none">3N:</span>
                  <span
                    className={`font-bold text-[13px] leading-5 truncate ${
                      isInactive('three_letter_name') ? 'text-red-600' : 'text-gray-800'
                    }`}
                  >
                    {data.is_virtual ? '-' : (code3 || '-')}
                  </span>
                </div>
              )}

              {/* Stage Type */}
              {(type === 'stage' || type === EntityType.STAGE) && (
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <span className="w-8 text-gray-400 font-medium text-xs shrink-0 select-none">Type:</span>
                  <span className="font-bold text-[13px] leading-5 truncate text-gray-800">Tournament Stage</span>
                </div>
              )}
            </>
          )}

          {/* Category for other types */}
          {type !== 'city' && data.categories && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="w-14 text-gray-400 font-medium text-xs shrink-0 select-none">Category:</span>
              <div className="flex items-center gap-1 flex-wrap">
                {data.categories.split(',').map((cat: string, idx: number) => (
                  <Tag color="cyan" key={idx} className="m-0 text-xs font-normal">
                    {cat.trim()}
                  </Tag>
                ))}
              </div>
            </div>
          )}



          {/* Note */}
          {data.note && (
            <div className="flex items-baseline gap-1.5 text-xs text-gray-500 min-w-0">
              <span className="w-8 text-gray-400 font-medium text-xs shrink-0 select-none">Note:</span>
              <span className="truncate text-gray-600" title={data.note}>{data.note}</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: Action Buttons (Eye, Info, Edit, Delete) */}
      <div className="pt-2 mt-auto border-t border-gray-100 flex items-center justify-end gap-0.5">
        {renderChildButtons()}

        {/* Info button on EVERY card */}
        <Tooltip title="Info">
          <Button
            type="text"
            shape="circle"
            size="small"
            icon={<InfoCircleOutlined style={{ color: '#0ea5e9', fontSize: 13 }} />}
            onClick={(e) => {
              e.stopPropagation();
              setModalMode('view');
              setIsInfoOpen(true);
            }}
          />
        </Tooltip>

        {(canEdit || canDelete) && (
          <div className="flex items-center gap-0.5 shrink-0">
            {canEdit && (
              <Tooltip title="Edit">
                <Button
                  type="text"
                  shape="circle"
                  size="small"
                  icon={<EditOutlined style={{ color: '#1677ff', fontSize: 13 }} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setModalMode('edit');
                    setIsInfoOpen(true);
                  }}
                />
              </Tooltip>
            )}
            {canDelete && (
              <Popconfirm
                title="Delete Record"
                description={`Are you sure you want to delete "${title}"?`}
                onConfirm={() => onDelete(data)}
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Delete">
                  <Button
                    type="text"
                    shape="circle"
                    size="small"
                    danger
                    icon={<DeleteOutlined style={{ fontSize: 13 }} />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Tooltip>
              </Popconfirm>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Unified Record Detail + Edit Modal */}
    <RecordDetailModal
      isOpen={isInfoOpen}
      onClose={() => setIsInfoOpen(false)}
      data={data}
      type={type}
      initialMode={modalMode}
    />
  </>
);
}
