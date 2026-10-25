'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, Button, Tooltip, Popconfirm, message } from 'antd';
import {
  SafetyOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  FlagOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  ApartmentOutlined,
  CopyOutlined,
  CheckOutlined,
} from '@ant-design/icons';

import { EntityType } from '../types';
import { getConfederationLogoUrl, getNationLogoUrl } from '../services/api';
import RecordDetailModal from './RecordDetailModal';
import {
  NationIcon,
  IntCompIcon,
  DomesticCompIcon,
  ClubIcon,
  StadiumIcon,
  CityIcon,
  AwardIcon,
} from './EntityIcons';

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

export function formatCategoryCode(categoryStr?: string | null): string {
  if (!categoryStr || typeof categoryStr !== 'string') return '';
  const trimmed = categoryStr.trim();
  if (!trimmed) return '';

  const upper = trimmed.toUpperCase();
  if (
    upper === '[CUP]' ||
    upper === '[YTH]' ||
    upper === '[OTH]' ||
    /^\[L\d+\]$/.test(upper) ||
    upper === '[L]'
  ) {
    return upper;
  }

  const lower = trimmed.toLowerCase();

  // 1. Youth => [YTH]
  if (
    lower.includes('youth') ||
    lower.includes('u21') ||
    lower.includes('u19') ||
    lower.includes('u18') ||
    lower.includes('u23')
  ) {
    return '[YTH]';
  }

  // 2. Cup => [CUP]
  if (lower.includes('cup')) {
    return '[CUP]';
  }

  // 3. League (n) => [Ln]
  const leagueMatch =
    trimmed.match(/league\s*\(\s*(\d+)\s*\)/i) ||
    trimmed.match(/\((\d+)\)/) ||
    trimmed.match(/league\s*(\d+)/i) ||
    trimmed.match(/tier\s*(\d+)/i) ||
    trimmed.match(/division\s*(\d+)/i);

  if (leagueMatch) {
    return `[L${leagueMatch[1]}]`;
  }

  if (
    lower.includes('league') ||
    lower.includes('division') ||
    lower.includes('tier') ||
    lower.includes('lower leagues')
  ) {
    return '[L]';
  }

  // 4. Other => [OTH]
  return '[OTH]';
}

export function getCategoryTagColor(
  categoryStr?: string | null,
  isRedFn?: (val?: any) => boolean
): string {
  if (!categoryStr) return 'default';
  const upper = String(categoryStr).trim().toUpperCase();
  if (upper.includes('EXTINCT') || upper.includes('REMOVE')) {
    return 'error';
  }
  const code = formatCategoryCode(categoryStr);
  if (code.startsWith('[L')) return 'blue';
  if (code === '[CUP]') return 'green';
  if (code === '[YTH]') return 'purple';
  if (isRedFn && isRedFn(categoryStr)) return 'error';
  return 'default';
}

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
  const [idCopied, setIdCopied] = useState(false);

  const isRedKeyword = (val?: any): boolean => {
    if (!val || typeof val !== 'string') return false;
    const upper = val.trim().toUpperCase();
    return (
      upper === '[OTHER]' ||
      upper === '[EXTINCT]' ||
      upper === '[REMOVE]' ||
      upper === 'OTHER' ||
      upper === 'EXTINCT' ||
      upper === 'REMOVE' ||
      upper.startsWith('[OTHER]') ||
      upper.startsWith('[EXTINCT]') ||
      upper.startsWith('[REMOVE]')
    );
  };

  const isSpecialCard = Boolean(
    data.is_virtual ||
    data.id === '[EXTINCT]' ||
    data.id === '[OTHER]' ||
    data.id === '[REMOVE]' ||
    data.virtual_type === 'EXTINCT' ||
    data.virtual_type === 'OTHER' ||
    data.virtual_type === 'REMOVE' ||
    (typeof data.id === 'string' && data.id.startsWith('['))
  );

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpecialCard) return;
    if (data.id !== undefined && data.id !== null) {
      navigator.clipboard.writeText(String(data.id));
      setIdCopied(true);
      message.success(`Copied ID: ${data.id}`);
      setTimeout(() => setIdCopied(false), 2000);
    }
  };

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
      case 'confederation': {
        const confedLogo = getConfederationLogoUrl(data.id);
        return (
          <div className="relative w-6 h-6 shrink-0 flex items-center justify-center">
            {confedLogo ? (
              <img
                src={confedLogo}
                alt={data.name || 'Confederation'}
                className="w-6 h-6 object-contain rounded bg-white shadow-2xs border border-slate-200"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <span
              style={{ display: confedLogo ? 'none' : 'flex' }}
              className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200 items-center justify-center text-xs font-bold text-blue-700"
            >
              {data.name ? data.name[0] : 'C'}
            </span>
          </div>
        );
      }
      case EntityType.NATION:
      case 'nation':
        return (
          <span className="w-7 h-7 rounded-full bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600">
            <NationIcon size={16} />
          </span>
        );
      case EntityType.COMPETITION:
      case 'competition': {
        const isInter = Boolean(data.is_international || !data.nation_id);
        if (isInter) {
          return (
            <span className="w-7 h-7 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
              <IntCompIcon size={16} />
            </span>
          );
        }
        return (
          <span className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <DomesticCompIcon size={16} />
          </span>
        );
      }
      case EntityType.CLUB:
      case 'club':
        return (
          <span className="w-7 h-7 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <ClubIcon size={16} />
          </span>
        );
      case EntityType.STADIUM:
      case 'stadium':
        return (
          <span className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <StadiumIcon size={16} />
          </span>
        );
      case EntityType.CITY:
      case 'city':
        return (
          <span className="w-7 h-7 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
            <CityIcon size={16} />
          </span>
        );
      case EntityType.AWARD:
      case 'award':
        return (
          <span className="w-7 h-7 rounded-full bg-yellow-50 border border-yellow-200 flex items-center justify-center text-yellow-600">
            <AwardIcon size={16} />
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
        <Tooltip title={`Nations: ${count}`} trigger="hover" destroyTooltipOnHide>
          <Button
            type="text"
            shape="circle"
            size="small"
            icon={<EyeOutlined style={{ color: '#1677ff', fontSize: 13 }} />}
            onClick={(e) => {
              e.stopPropagation();
              (e.currentTarget as HTMLElement)?.blur();
              router.push(data.id ? `/nation?confedId=${data.id}` : '/nation');
            }}
          />
        </Tooltip>
      );
    }

    if (type === EntityType.NATION || type === 'nation') {
      const count = data.totalComps !== undefined ? data.totalComps : data.totalChildren;

      return (
        <Tooltip title={`Details`} trigger="hover" destroyTooltipOnHide>
          <Button
            type="text"
            shape="circle"
            size="small"
            icon={<EyeOutlined style={{ color: '#1677ff', fontSize: 13 }} />}
            onClick={(e) => {
              e.stopPropagation();
              (e.currentTarget as HTMLElement)?.blur();
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
            <Tooltip title={`Sub-Competitions (${childrenCnt})`} trigger="hover" destroyTooltipOnHide>
              <Button
                type="text"
                shape="circle"
                size="small"
                icon={<ApartmentOutlined style={{ color: '#d97706', fontSize: 13 }} />}
                onClick={(e) => {
                  e.stopPropagation();
                  (e.currentTarget as HTMLElement)?.blur();
                  onViewChildren?.(data);
                }}
              />
            </Tooltip>
          )}
          {(hasClubs || hasAwards) && (
            <Tooltip title={titleParts.join(' | ')} trigger="hover" destroyTooltipOnHide>
              <Button
                type="text"
                shape="circle"
                size="small"
                icon={<EyeOutlined style={{ color: '#1677ff', fontSize: 13 }} />}
                onClick={(e) => {
                  e.stopPropagation();
                  (e.currentTarget as HTMLElement)?.blur();
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
        className={`bg-white border border-gray-200 hover:border-blue-400 rounded-lg px-3 py-2 sm:px-3.5 sm:py-2.5 shadow-sm hover:shadow-md transition-all duration-150 flex flex-col justify-between group h-full ${
          isNavigable ? 'cursor-pointer' : ''
        }`}
      >
      <div>
        {/* Top Header Bar: [flag / thẻ tên], 2 thẻ màu, [Category Tag], [Extinct Tag] */}
        {(nationInfo || bgInfo || fgInfo || data.is_extinct || data.is_disabled || data.isDisabled || (type !== 'city' && (data.type || data.categories))) && (
          <div className="flex items-center justify-between gap-1.5 pb-1.5 mb-2 border-b border-gray-100 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              {/* [flag / thẻ tên] */}
              {nationInfo && (
                <Tooltip title={nationInfo.name ? `${nationInfo.name} • Chi tiết` : 'Chi tiết'} trigger="hover" destroyTooltipOnHide>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      (e.currentTarget as HTMLElement)?.blur();
                      setModalMode('view');
                      setIsInfoOpen(true);
                    }}
                    className="flex items-center gap-1 shrink-0 px-1.5 py-0.5 bg-slate-50 hover:bg-sky-50 hover:border-sky-300 border border-slate-200 rounded text-xs text-slate-600 hover:text-sky-700 transition-all cursor-pointer"
                    aria-label="View info"
                  >
                    {getNationLogoUrl(nationInfo.id, nationInfo.code) ? (
                      <img
                        src={getNationLogoUrl(nationInfo.id, nationInfo.code)}
                        alt={nationInfo.name || 'Nation'}
                        className="w-4 h-3 object-cover rounded-2xs border border-slate-200 shrink-0 inline-block"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : null}
                    {nationInfo.code && (
                      <span className="text-[10.5px] font-semibold text-inherit leading-none">
                        {nationInfo.code}
                      </span>
                    )}
                  </button>
                </Tooltip>
              )}

              {/* 2 thẻ màu */}
              {(bgInfo || fgInfo) && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 shrink-0"
                >
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
                        className="inline-block w-3.5 h-3.5 rounded border border-black/20 shadow-xs cursor-pointer hover:scale-110 transition-transform"
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
                        className="inline-block w-3.5 h-3.5 rounded border border-black/20 shadow-xs cursor-pointer hover:scale-110 transition-transform"
                        style={{
                          backgroundColor: fgInfo.css,
                        }}
                      />
                    </Tooltip>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 ml-auto shrink-0 min-w-0">
              {type !== 'city' && (data.type || data.categories) && (
                <Tooltip title={data.type || data.categories} trigger="hover" destroyTooltipOnHide>
                  <Tag
                    color={getCategoryTagColor(data.type || data.categories, isRedKeyword)}
                    className="m-0 text-[10px] sm:text-[10.5px] font-semibold shrink-0 py-0 px-1.5 leading-tight font-mono cursor-default"
                  >
                    {formatCategoryCode(data.type || data.categories)}
                  </Tag>
                </Tooltip>
              )}

              {data.is_extinct && (
                <Tag color="red" className="m-0 text-[10px] font-semibold shrink-0 py-0 px-1 leading-tight">
                  Extinct
                </Tag>
              )}

              {(data.is_disabled || data.isDisabled) && (
                <Tag color="red" className="m-0 text-[10px] font-semibold shrink-0 py-0 px-1 leading-tight">
                  Disabled
                </Tag>
              )}
            </div>
          </div>
        )}

        {/* Fields List formatted as [label]: on line 1, [value] on line 2 on mobile; inline on desktop */}
        {(() => {
          const isPlayer = type === 'player' || type === EntityType.PLAYER;
          const isCityOrStadium =
            type === 'city' || type === EntityType.CITY || type === 'stadium' || type === EntityType.STADIUM;

          const hasId = data.id !== undefined && data.id !== null && data.id !== '';

          {/* Reusable ID field row for middle/top of card body */}
          const renderIdRow = (customLabelWidth?: string) => {
            if (!hasId) {
              return null;
            }
            const lblWidth = customLabelWidth || 'sm:w-8';
            return (
              <div className="sm:flex sm:items-center sm:gap-1.5 min-w-0 mt-1 sm:mt-0">
                <span className={`text-gray-400 font-medium text-[10.5px] sm:text-xs block sm:inline ${lblWidth} sm:shrink-0 select-none mb-0.5 sm:mb-0 leading-none`}>
                  ID:
                </span>
                <div className="flex sm:inline-flex items-center gap-1.5 min-w-0">
                  {/* Nút info cạnh ID text - KHÔNG hiển thị cho card [OTHER], [EXTINCT], [REMOVE] */}
                  {!isSpecialCard && (
                    <Tooltip title="Chi tiết" trigger="hover" destroyTooltipOnHide>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          (e.currentTarget as HTMLElement)?.blur();
                          setModalMode('view');
                          setIsInfoOpen(true);
                        }}
                        className="w-4 h-4 rounded-full flex items-center justify-center text-sky-500 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer shrink-0"
                        aria-label="Chi tiết"
                      >
                        <InfoCircleOutlined className="text-[11.5px]" />
                      </button>
                    </Tooltip>
                  )}

                  {/* ID text: Với [OTHER], [EXTINCT], [REMOVE] thì KHÔNG copy, chỉ hiển thị text thường màu đỏ */}
                  {isSpecialCard ? (
                    <span
                      className={`font-mono font-bold text-xs sm:text-[13px] shrink-0 select-none ${
                        isRedKeyword(data.id) || isRedKeyword(data.virtual_type)
                          ? 'text-red-600'
                          : 'text-gray-700'
                      }`}
                    >
                      {data.id}
                    </span>
                  ) : (
                    <Tooltip title={idCopied ? 'Đã sao chép!' : 'Nhấn để copy ID'} trigger="hover" destroyTooltipOnHide>
                      <span
                        onClick={handleCopyId}
                        className={`font-mono font-bold text-xs sm:text-[13px] hover:text-blue-600 cursor-pointer select-all transition-colors inline-flex items-center gap-1 group/id shrink-0 ${
                          isRedKeyword(data.id) ? 'text-red-600' : 'text-gray-800'
                        }`}
                        title={
                          data.is_virtual || data.id === '[EXTINCT]' || data.id === '[OTHER]' || data.id === '[REMOVE]'
                            ? data.virtual_type === 'EXTINCT' || data.id === '[EXTINCT]'
                              ? 'Extinct Clubs'
                              : data.id === '[REMOVE]' || data.virtual_type === 'REMOVE'
                              ? 'Removed Records'
                              : 'Other Clubs (Unassigned)'
                            : undefined
                        }
                      >
                        <span>{data.id}</span>
                        {idCopied ? (
                          <CheckOutlined className="text-emerald-500 text-[10px]" />
                        ) : (
                          <CopyOutlined className="text-gray-400 group-hover/id:text-blue-500 opacity-0 group-hover/id:opacity-100 transition-opacity text-[10px]" />
                        )}
                      </span>
                    </Tooltip>
                  )}
                </div>
              </div>
            );
          };

          return (
            /* Fields List formatted as [label]: \n [value] on mobile; [label]: [value] inline on desktop */
            <div className="space-y-1.5 sm:space-y-1 mb-1 text-xs">
              {isPlayer ? (
                <>
                  {/* Trường ID ở dòng đầu tiên của nội dung */}
                  {renderIdRow()}

                  <div className="sm:flex sm:items-baseline sm:gap-1.5 min-w-0 mt-1 sm:mt-0">
                    <span className="text-gray-400 font-medium text-[10.5px] sm:text-xs block sm:inline sm:w-8 sm:shrink-0 select-none mb-0.5 sm:mb-0 leading-none">
                      FN:
                    </span>
                    <span className="font-bold text-xs sm:text-[13px] leading-snug sm:leading-5 truncate block sm:inline text-gray-800">
                      {data.first_name || '-'}
                    </span>
                  </div>
                  <div className="sm:flex sm:items-baseline sm:gap-1.5 min-w-0 mt-1 sm:mt-0">
                    <span className="text-gray-400 font-medium text-[10.5px] sm:text-xs block sm:inline sm:w-8 sm:shrink-0 select-none mb-0.5 sm:mb-0 leading-none">
                      SN:
                    </span>
                    <span className="font-bold text-xs sm:text-[13px] leading-snug sm:leading-5 truncate block sm:inline text-gray-800">
                      {data.second_name || '-'}
                    </span>
                  </div>
                  {data.common_name && (
                    <div className="sm:flex sm:items-baseline sm:gap-1.5 min-w-0 mt-1 sm:mt-0">
                      <span className="text-gray-400 font-medium text-[10.5px] sm:text-xs block sm:inline sm:w-8 sm:shrink-0 select-none mb-0.5 sm:mb-0 leading-none">
                        CN:
                      </span>
                      <span className="font-bold text-xs sm:text-[13px] leading-snug sm:leading-5 truncate text-gray-700 italic block sm:inline">
                        {data.common_name}
                      </span>
                    </div>
                  )}
                </>
              ) : isCityOrStadium ? (
                <>
                  {/* Trường ID ở dòng đầu tiên của nội dung */}
                  {renderIdRow('sm:w-10 sm:w-12')}

                  <div className="sm:flex sm:items-start sm:gap-1.5 min-w-0 mt-1 sm:mt-0">
                    <span className={`text-[10.5px] sm:text-xs block sm:inline sm:w-10 sm:w-12 sm:shrink-0 select-none mb-0.5 sm:mb-0 pt-0.5 leading-none ${
                      isInactive('name') || isInactive('long_name') ? 'text-red-600 font-normal' : 'text-gray-400 font-medium'
                    }`}>
                      Name:
                    </span>
                    <span
                      className={`font-bold text-xs sm:text-[13px] leading-[17px] sm:leading-[18px] line-clamp-3 break-words block sm:inline ${
                        isInactive('name') || isInactive('long_name') || isTitleInactive || isRedKeyword(title) ? 'text-red-600' : 'text-gray-800'
                      }`}
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
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
                    <div className="sm:flex sm:items-start sm:gap-1.5 min-w-0 mt-1.5 sm:mt-1">
                      <span className={`text-[10.5px] sm:text-xs block sm:inline sm:w-10 sm:w-12 sm:shrink-0 select-none mb-0.5 sm:mb-0 pt-0.5 leading-none ${
                        isInactive('categories') ? 'text-red-600 font-normal' : 'text-gray-400 font-medium'
                      }`}>
                        Region:
                      </span>
                      <span
                        className={`font-bold text-xs sm:text-[13px] leading-[17px] sm:leading-[18px] line-clamp-2 break-words block sm:inline ${
                          isInactive('categories') || isRedKeyword(data.categories) ? 'text-red-600' : 'text-gray-800'
                        }`}
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
                  {/* Trường ID ở dòng đầu tiên của nội dung (nằm trên LN) */}
                  {renderIdRow()}

                  {/* LN */}
                  <div className="sm:flex sm:items-start sm:gap-1.5 min-w-0 mt-1 sm:mt-0">
                    <span className={`text-[10.5px] sm:text-xs block sm:inline sm:w-8 sm:shrink-0 select-none mb-0.5 sm:mb-0 pt-0.5 leading-none ${
                      isInactive('long_name') || isInactive('name') ? 'text-red-600 font-normal' : 'text-gray-400 font-medium'
                    }`}>
                      LN:
                    </span>
                    <span
                      className={`font-bold text-xs sm:text-[13px] leading-[17px] sm:leading-[18px] line-clamp-3 break-words block sm:inline ${
                        isInactive('long_name') || isInactive('name') || isTitleInactive || isRedKeyword(data.long_name || title) ? 'text-red-600' : 'text-gray-800'
                      }`}
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        wordBreak: 'break-word',
                      }}
                      title={data.is_virtual ? '-' : (data.long_name || title)}
                    >
                      {data.is_virtual ? '-' : (data.long_name || title)}
                    </span>
                  </div>

                  {/* SN */}
                  {(hasThreeLetter || data.short_name || data.is_virtual) && (
                    <div className="sm:flex sm:items-start sm:gap-1.5 min-w-0 mt-1 sm:mt-0">
                      <span className={`text-[10.5px] sm:text-xs block sm:inline sm:w-8 sm:shrink-0 select-none mb-0.5 sm:mb-0 pt-0.5 leading-none ${
                        isInactive('short_name') ? 'text-red-600 font-normal' : 'text-gray-400 font-medium'
                      }`}>
                        SN:
                      </span>
                      <span
                        className={`font-bold text-xs sm:text-[13px] leading-[17px] sm:leading-[18px] line-clamp-3 break-words block sm:inline ${
                          isInactive('short_name') || isRedKeyword(data.short_name || title) ? 'text-red-600' : 'text-gray-800'
                        }`}
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          wordBreak: 'break-word',
                        }}
                        title={data.is_virtual ? '-' : (data.short_name || title)}
                      >
                        {data.is_virtual ? '-' : (data.short_name || title)}
                      </span>
                    </div>
                  )}

                  {/* 6N */}
                  {(type === 'club' || type === EntityType.CLUB || data.six_letter_name) && (
                    <div className="sm:flex sm:items-baseline sm:gap-1.5 min-w-0 mt-1 sm:mt-0">
                      <span className={`text-[10.5px] sm:text-xs block sm:inline sm:w-8 sm:shrink-0 select-none mb-0.5 sm:mb-0 leading-none ${
                        isInactive('six_letter_name') ? 'text-red-600 font-normal' : 'text-gray-400 font-medium'
                      }`}>
                        6N:
                      </span>
                      <span
                        className={`font-bold text-xs sm:text-[13px] leading-snug sm:leading-5 truncate block sm:inline ${
                          isInactive('six_letter_name') ? 'text-red-600' : 'text-gray-800'
                        }`}
                      >
                        {code6 || '-'}
                      </span>
                    </div>
                  )}

                  {/* 3N */}
                  {(hasThreeLetter || data.three_letter_name || data.is_virtual) && (
                    <div className="sm:flex sm:items-baseline sm:gap-1.5 min-w-0 mt-1 sm:mt-0">
                      <span className={`text-[10.5px] sm:text-xs block sm:inline sm:w-8 sm:shrink-0 select-none mb-0.5 sm:mb-0 leading-none ${
                        isInactive('three_letter_name') ? 'text-red-600 font-normal' : 'text-gray-400 font-medium'
                      }`}>
                        3N:
                      </span>
                      <span
                        className={`font-bold text-xs sm:text-[13px] leading-snug sm:leading-5 truncate block sm:inline ${
                          isInactive('three_letter_name') ? 'text-red-600' : 'text-gray-800'
                        }`}
                      >
                        {data.is_virtual ? '-' : (code3 || '-')}
                      </span>
                    </div>
                  )}

                  {/* Stage Type */}
                  {(type === 'stage' || type === EntityType.STAGE) && (
                    <div className="sm:flex sm:items-baseline sm:gap-1.5 min-w-0 mt-1 sm:mt-0">
                      <span className="text-gray-400 font-medium text-[10.5px] sm:text-xs block sm:inline sm:w-8 sm:shrink-0 select-none mb-0.5 sm:mb-0 leading-none">
                        Type:
                      </span>
                      <span className="font-bold text-xs sm:text-[13px] leading-snug sm:leading-5 truncate block sm:inline text-gray-800">
                        Tournament Stage
                      </span>
                    </div>
                  )}
                </>
              )}


              {/* Note */}
              {data.note && (
                <div className="sm:flex sm:items-baseline sm:gap-1.5 text-[11px] sm:text-xs text-gray-500 min-w-0 mt-1 sm:mt-0">
                  <span className="text-gray-400 font-medium text-[10.5px] sm:text-xs block sm:inline sm:w-8 sm:shrink-0 select-none mb-0.5 sm:mb-0 leading-none">
                    Note:
                  </span>
                  <span className="truncate text-gray-600 block sm:inline" title={data.note}>
                    {data.note}
                  </span>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Card Footer: Action Buttons (Eye, Edit, Delete) */}
      {(Boolean(renderChildButtons()) || canEdit || canDelete) && (
        <div className="pt-1 mt-auto border-t border-gray-100 flex items-center justify-end gap-0.5">
          {renderChildButtons()}

          {(canEdit || canDelete) && (
            <div className="flex items-center gap-0.5 shrink-0">
              {canEdit && (
                <Tooltip
                  title="Edit"
                  trigger="hover"
                  destroyTooltipOnHide
                  open={isInfoOpen ? false : undefined}
                >
                  <Button
                    type="text"
                    shape="circle"
                    size="small"
                    icon={<EditOutlined style={{ color: '#1677ff', fontSize: 13 }} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      (e.currentTarget as HTMLElement)?.blur();
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
                  <Tooltip title="Delete" trigger="hover" destroyTooltipOnHide>
                    <Button
                      type="text"
                      shape="circle"
                      size="small"
                      danger
                      icon={<DeleteOutlined style={{ fontSize: 13 }} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        (e.currentTarget as HTMLElement)?.blur();
                      }}
                    />
                  </Tooltip>
                </Popconfirm>
              )}
            </div>
          )}
        </div>
      )}
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
