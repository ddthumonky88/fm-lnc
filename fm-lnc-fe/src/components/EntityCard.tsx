'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, Button, Tooltip, Popconfirm, Dropdown, App } from 'antd';
import {
  SafetyOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  FlagOutlined,
  EyeOutlined,
  BranchesOutlined,
  CopyOutlined,
  CheckOutlined,
  InfoCircleOutlined,
  EllipsisOutlined,
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

export interface EntityCardField {
  label: React.ReactNode;
  value: React.ReactNode;
  isInactive?: boolean;
  isRed?: boolean;
  lineClamp?: number;
  align?: 'start' | 'baseline' | 'center';
  title?: string;
}

export interface EntityCardProps {
  type: EntityType | string;
  data: any;
  values?: EntityCardField[];
  cardSize?: 'small' | 'large';
  largeStyle?: '1-line' | '2-line';
  cardStyle?: '1-line' | '2-line';
  onNavigate?: (step: any) => void;
  onEdit?: (record: any) => void;
  onDelete?: (record: any) => void;
  onViewChildren?: (record: any) => void;
}

const formatCode = (code?: string | null) => {
  if (
    !code ||
    typeof code !== 'string' ||
    code.trim() === '' ||
    code.trim().toUpperCase() === 'UNK'
  ) {
    return null;
  }
  return code.trim();
};

export function formatCategoryCode(categoryStr?: string | null): string {
  if (!categoryStr || typeof categoryStr !== 'string') return '';
  const trimmed = categoryStr.trim();
  if (!trimmed) return '';

  const upper = trimmed.toUpperCase().replace(/^\[/, '').replace(/\]$/, '');
  if (
    upper === 'CUP' ||
    upper === 'YTH' ||
    upper === 'OTH' ||
    upper === 'EXT' ||
    /^L\d+$/.test(upper) ||
    upper === 'L'
  ) {
    return upper;
  }

  const lower = trimmed.toLowerCase();

  // 0. Extinct => EXT
  if (lower.includes('extinct')) {
    return 'EXT';
  }

  // 1. Youth => YTH
  if (
    lower.includes('youth') ||
    lower.includes('u21') ||
    lower.includes('u19') ||
    lower.includes('u18') ||
    lower.includes('u23')
  ) {
    return 'YTH';
  }

  // 2. Cup => CUP
  if (lower.includes('cup')) {
    return 'CUP';
  }

  // 3. League (n) => Ln
  const leagueMatch =
    trimmed.match(/league\s*\(\s*(\d+)\s*\)/i) ||
    trimmed.match(/\((\d+)\)/) ||
    trimmed.match(/league\s*(\d+)/i) ||
    trimmed.match(/tier\s*(\d+)/i) ||
    trimmed.match(/division\s*(\d+)/i);

  if (leagueMatch) {
    return `L${leagueMatch[1]}`;
  }

  if (
    lower.includes('league') ||
    lower.includes('division') ||
    lower.includes('tier') ||
    lower.includes('lower leagues')
  ) {
    return 'L';
  }

  // 4. Other => OTH
  return 'OTH';
}

export function getCategoryTagColor(
  categoryStr?: string | null,
  isRedFn?: (val?: any) => boolean,
): string {
  if (!categoryStr) return 'default';
  const upper = String(categoryStr).trim().toUpperCase();
  if (upper.includes('EXTINCT') || upper.includes('REMOVE')) {
    return 'error';
  }
  const code = formatCategoryCode(categoryStr);
  if (code.startsWith('L') || code.startsWith('[L')) return 'blue';
  if (code === 'CUP' || code === '[CUP]') return 'green';
  if (code === 'YTH' || code === '[YTH]') return 'purple';
  if (isRedFn && isRedFn(categoryStr)) return 'error';
  return 'default';
}

export default function EntityCard({
  type,
  data,
  values,
  cardSize,
  largeStyle = '1-line',
  cardStyle,
  onNavigate,
  onEdit,
  onDelete,
  onViewChildren,
}: EntityCardProps) {
  const { message } = App.useApp();
  const router = useRouter();
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [idCopied, setIdCopied] = useState(false);

  const entityTypeStr = String(type).toLowerCase();
  const isSmall =
    cardSize !== undefined
      ? cardSize === 'small'
      : entityTypeStr === 'nation' ||
        entityTypeStr === 'stadium' ||
        entityTypeStr === 'city';

  const is2Line = !isSmall && (largeStyle === '2-line' || cardStyle === '2-line');

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
    (typeof data.id === 'string' && data.id.startsWith('[')),
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

  const code3 = formatCode(data.name_3l);
  const code6 = formatCode(data.name_6l);
  const title =
    type === EntityType.PLAYER
      ? `${data.first_name || ''} ${data.second_name || ''}`.trim() ||
        data.common_name ||
        'Unnamed Player'
      : data.name_lg || data.name || 'Unnamed';
  const subtitle =
    type === EntityType.PLAYER
      ? data.common_name
        ? `"${data.common_name}"`
        : 'Person / Player'
      : type === EntityType.STAGE
        ? 'Tournament Stage'
        : data.name_sh || '';
  const hasThreeLetter =
    [
      EntityType.NATION,
      EntityType.COMPETITION,
      EntityType.CLUB,
    ].includes(type as any) ||
    'name_3l' in data;

  const inactiveList = (data.inactive_fields || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);
  const isInactive = (field: string) => inactiveList.includes(field.toLowerCase());

  const canEdit =
    onEdit &&
    type !== EntityType.CONFEDERATION &&
    type !== EntityType.NATION &&
    !data.is_virtual;
  const canDelete =
    onDelete &&
    type !== EntityType.CONFEDERATION &&
    type !== EntityType.NATION &&
    !data.is_virtual;

  const isTitleInactive =
    isInactive('name_lg') || isInactive('name');


  const isNavigable = Boolean(
    data.is_virtual ||
      type === EntityType.NATION ||
      type === 'nation' ||
      type === EntityType.COMPETITION ||
      type === 'competition' ||
      (type === EntityType.CLUB || type === 'club' ? Boolean(data.id && !isSpecialCard) : false) ||
      (type === EntityType.CITY || type === 'city' ? Boolean(data.id) : false) ||
      (type === EntityType.STADIUM || type === 'stadium' ? Boolean(data.id) : false) ||
      (type === EntityType.AWARD || type === 'award' ? Boolean(data.id) : false) ||
      (type === EntityType.CONFEDERATION || type === 'confederation'
        ? (data.totalNations || 0) > 0
        : false),
  );

  const handleNavigateAction = () => {
    if (isInfoOpen) return;
    if (data.is_virtual) {
      if (!onNavigate) return;
      const isExtinct =
        data.virtual_type === 'EXTINCT' ||
        String(data.id).startsWith('ext-') ||
        data.id === '[EXTINCT]';
      const nId =
        data.nation_id ||
        (typeof data.id === 'string' && data.id.includes('-')
          ? data.id.split('-')[1]
          : undefined);
      const fakeId = isExtinct ? `ext-${nId}` : `oth-${nId}`;
      onNavigate({
        level: 'INDEPENDENT_CLUBS',
        id: fakeId,
        virtualId: data.id,
        nationId: nId,
        title: data.name_lg || data.name_sh || title,
        metadata: { is_extinct: isExtinct, nation_id: nId },
      });
    } else if (type === EntityType.NATION) {
      const count = data.totalComps !== undefined ? data.totalComps : data.totalChildren;
      if (onNavigate) {
        onNavigate({
          level: 'NATION_HUB',
          id: data.id,
          title: `[${data.name_3l || ''}] ${data.name_lg || data.name || ''}`,
        });
      } else if (data.id) {
        router.push(`/nation/${data.id}`);
      }
    } else if (type === EntityType.COMPETITION) {
      const clubsCnt = data.clubsCount ?? data.stats?.club ?? 0;
      const awardsCnt = data.awardsCount ?? data.stats?.award ?? 0;
      if (onNavigate) {
        if (clubsCnt > 0) {
          onNavigate({
            level: 'CLUBS_IN_COMP',
            id: data.id,
            title: `${data.name_sh || data.name_lg || data.name || ''}`,
          });
        } else if (awardsCnt > 0) {
          onNavigate({
            level: 'COMP_AWARDS',
            id: data.id,
            title: `${data.name_sh || data.name_lg || data.name || ''} - Awards`,
          });
        } else {
          onNavigate({
            level: 'CLUBS_IN_COMP',
            id: data.id,
            title: `${data.name_sh || data.name_lg || data.name || ''}`,
          });
        }
      } else if (data.id) {
        router.push(`/comp/${data.id}`);
      }
    } else if (type === EntityType.CLUB || type === 'club') {
      if (!isSpecialCard && data.id) {
        if (onNavigate) {
          onNavigate({
            type: 'club',
            id: data.id,
            title: data.name_sh || data.name_lg || data.name || '',
          });
        } else {
          router.push(`/club/${data.id}`);
        }
      }
    } else if (type === EntityType.CITY || type === 'city') {
      if (data.id) {
        if (onNavigate) {
          onNavigate({ type: 'city', id: data.id, title: data.name_lg || data.name || '' });
        } else {
          router.push(`/city/${data.id}`);
        }
      }
    } else if (type === EntityType.STADIUM || type === 'stadium') {
      if (data.id) {
        if (onNavigate) {
          onNavigate({ type: 'stadium', id: data.id, title: data.name || '' });
        } else {
          router.push(`/stadium/${data.id}`);
        }
      }
    } else if (type === EntityType.AWARD || type === 'award') {
      if (data.id) {
        if (onNavigate) {
          onNavigate({ type: 'award', id: data.id, title: data.name_lg || data.name || '' });
        } else {
          router.push(`/award/${data.id}`);
        }
      }
    }
  };

  const actionMenuItems: any[] = [
    {
      key: 'navigate',
      icon: <EyeOutlined className="text-blue-600" />,
      label: 'Xem chi tiết',
      onClick: (e: any) => {
        e?.domEvent?.stopPropagation();
        handleNavigateAction();
      },
    },
    ...(!isSpecialCard
      ? [
          {
            key: 'info',
            icon: <InfoCircleOutlined className="text-sky-500" />,
            label: 'Thông tin nhanh (Modal)',
            onClick: (e: any) => {
              e?.domEvent?.stopPropagation();
              setModalMode('view');
              setIsInfoOpen(true);
            },
          },
        ]
      : []),
    ...(data.childrenCount || data.children_count
      ? [
          {
            key: 'subcomps',
            icon: <BranchesOutlined className="text-amber-500" />,
            label: `Giải đấu phụ (${data.childrenCount || data.children_count})`,
            onClick: (e: any) => {
              e?.domEvent?.stopPropagation();
              onViewChildren?.(data);
            },
          },
        ]
      : []),
    ...(onEdit
      ? [
          {
            key: 'edit',
            icon: <EditOutlined className="text-emerald-600" />,
            label: 'Chỉnh sửa',
            onClick: (e: any) => {
              e?.domEvent?.stopPropagation();
              onEdit(data);
            },
          },
        ]
      : []),
    ...(onDelete
      ? [
          {
            key: 'delete',
            icon: <DeleteOutlined className="text-red-500" />,
            label: 'Xóa',
            danger: true,
            onClick: (e: any) => {
              e?.domEvent?.stopPropagation();
              onDelete(data);
            },
          },
        ]
      : []),
  ];

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
        className={`bg-blue-50/70 hover:bg-blue-50 border border-blue-200/80 hover:border-blue-400 rounded-lg ${
          isSmall ? 'px-2.5 py-2' : 'px-3 py-2 sm:px-3.5 sm:py-2.5'
        } shadow-2xs hover:shadow-md transition-all duration-150 flex flex-col justify-between group h-full ${
          isNavigable ? 'cursor-pointer' : ''
        }`}
      >
        <div>
          {/* Top Header Bar: chỉ gồm [Thẻ ID] và [btn 3 chấm] */}
          <div className="flex items-center justify-between gap-1.5 pb-1.5 mb-2 border-b border-blue-200/60 min-w-0">
            <div className="flex items-center min-w-0">
                {data.id !== undefined && data.id !== null && data.id !== '' && (
                  <div onClick={(e) => e.stopPropagation()} className="flex items-center shrink-0">
                    {isSpecialCard ? (
                      <Tag
                        style={{
                          border:
                            isRedKeyword(data.id) || isRedKeyword(data.virtual_type)
                              ? '1px solid #f87171'
                              : '1px solid #cbd5e1',
                          color:
                            isRedKeyword(data.id) || isRedKeyword(data.virtual_type)
                              ? '#dc2626'
                              : '#334155',
                          backgroundColor:
                            isRedKeyword(data.id) || isRedKeyword(data.virtual_type)
                              ? '#fef2f2'
                              : '#ffffff',
                        }}
                        className="m-0 font-mono font-bold text-xs shrink-0 select-none py-0 px-1.5 leading-tight shadow-2xs"
                      >
                        {String(data.id).replace(/^\[/, '').replace(/\]$/, '')}
                      </Tag>
                    ) : (
                      <Tooltip
                        title={idCopied ? 'Đã sao chép!' : 'Nhấn để copy ID'}
                        trigger="hover"
                        destroyOnHidden
                      >
                        <Tag
                          onClick={handleCopyId}
                          style={{
                            border: isRedKeyword(data.id)
                              ? '1px solid #f87171'
                              : '1px solid #60a5fa',
                            color: isRedKeyword(data.id) ? '#dc2626' : '#1d4ed8',
                            backgroundColor: isRedKeyword(data.id)
                              ? '#fef2f2'
                              : 'rgba(239, 246, 255, 0.85)',
                          }}
                          className="m-0 font-mono font-bold text-xs hover:opacity-85 cursor-pointer select-all transition-all inline-flex items-center gap-1 shrink-0 py-0.5 px-2 leading-tight shadow-2xs"
                          title={
                            data.is_virtual ||
                            data.id === '[EXTINCT]' ||
                            data.id === '[OTHER]' ||
                            data.id === '[REMOVE]'
                              ? data.virtual_type === 'EXTINCT' || data.id === '[EXTINCT]'
                                ? 'Extinct Clubs'
                                : data.id === '[REMOVE]' || data.virtual_type === 'REMOVE'
                                  ? 'Removed Records'
                                  : 'Other Clubs (Unassigned)'
                              : undefined
                          }
                        >
                          <span>{String(data.id).replace(/^\[/, '').replace(/\]$/, '')}</span>
                          {idCopied ? (
                            <CheckOutlined className="text-emerald-500 text-[10px]" />
                          ) : (
                            <CopyOutlined className="text-[10px] text-blue-500 hover:text-blue-700" />
                          )}
                        </Tag>
                      </Tooltip>
                    )}
                  </div>
                )}
            </div>
            <div className="flex items-center ml-auto shrink-0">
              <Dropdown
                menu={{ items: actionMenuItems }}
                trigger={['click']}
                placement="bottomRight"
              >
                <Button
                  type="text"
                  shape="circle"
                  size="small"
                  icon={
                    <EllipsisOutlined
                      style={{ fontSize: 16 }}
                      className="text-slate-500 hover:text-blue-600 transition-colors"
                    />
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    (e.currentTarget as HTMLElement)?.blur();
                  }}
                  className="w-6 h-6 flex items-center justify-center hover:bg-blue-100/70 rounded-full cursor-pointer"
                />
              </Dropdown>
            </div>
          </div>

          {/* Fields List formatted as [label]: [value] (1:3 ratio) with support for custom values or type-based defaults */}
          {(() => {
            // Determine default fields list based on entity type and data
            const getDefaultFields = (): EntityCardField[] => {
              const fields: EntityCardField[] = [];
              const entityTypeStr = String(type).toLowerCase();

              // Specific Entity Type Fields
              if (entityTypeStr === 'player') {
                fields.push({
                  label: 'FN:',
                  value: data.first_name || '-',
                });
                fields.push({
                  label: 'SN:',
                  value: data.second_name || '-',
                });
                if (data.common_name) {
                  fields.push({
                    label: 'CN:',
                    value: (
                      <span className="font-bold text-xs sm:text-[13px] leading-snug truncate text-gray-700 italic min-w-0 block">
                        {data.common_name}
                      </span>
                    ),
                  });
                }
              } else if (entityTypeStr === 'city') {
                fields.push({
                  label: 'Name:',
                  value: title,
                  align: 'start',
                  lineClamp: 3,
                  isInactive: isInactive('name') || isTitleInactive,
                  isRed: isRedKeyword(title),
                });
                let regionVal = data.region;
                if (regionVal) {
                  regionVal = String(regionVal).replace(/^\[[^\]]+\]\s*/, '').trim();
                  fields.push({
                    label: 'Region:',
                    value: regionVal,
                    align: 'start',
                    lineClamp: 2,
                    isInactive: isInactive('region'),
                    isRed: isRedKeyword(regionVal),
                  });
                }
              } else if (entityTypeStr === 'stadium') {
                fields.push({
                  label: 'Name:',
                  value: title,
                  align: 'start',
                  lineClamp: 3,
                  isInactive: isInactive('name') || isTitleInactive,
                  isRed: isRedKeyword(title),
                });
              } else if (entityTypeStr === 'club') {
                fields.push({
                  label: 'LN:',
                  value: data.is_virtual ? '-' : data.name_lg || title,
                  align: 'start',
                  lineClamp: 2,
                  isInactive:
                    isInactive('name_lg') ||
                    isInactive('name') ||
                    isTitleInactive,
                  isRed: isRedKeyword(data.name_lg || title),
                });

                if (hasThreeLetter || data.name_sh || data.is_virtual) {
                  fields.push({
                    label: 'SN:',
                    value: data.is_virtual ? '-' : data.name_sh || title,
                    align: 'start',
                    lineClamp: 2,
                    isInactive: isInactive('name_sh'),
                    isRed: isRedKeyword(data.name_sh || title),
                  });
                }

                fields.push({
                  label: '6N:',
                  value: code6 || '-',
                  isInactive: isInactive('name_6l'),
                });

                fields.push({
                  label: '3N:',
                  value: data.is_virtual ? '-' : code3 || '-',
                  isInactive: isInactive('name_3l'),
                });

                // Comp
                const compObj = data.comp || (data as any).competition;
                const compNameSh =
                  compObj?.name_sh ||
                  compObj?.name;
                const compValue = data.is_extinct ? 'EXT' : compNameSh || '-';
                const isExt = data.is_extinct || compValue === 'EXT';

                fields.push({
                  label: 'Comp:',
                  value: (
                    <span
                      className={`font-bold text-xs sm:text-[13px] leading-snug truncate min-w-0 block ${
                        isExt
                          ? 'text-red-600'
                          : compValue === '-'
                            ? 'text-gray-400 font-normal'
                            : 'text-gray-800'
                      }`}
                      title={compObj?.name_lg || compObj?.name || compValue}
                    >
                      {compValue}
                    </span>
                  ),
                });

                const affClub = data.affiliate_club;
                const affType = affClub?.type;
                const affId = affClub?.id;

                if (affType || affId) {
                  const pName =
                    affClub?.name_sh ||
                    affClub?.name_lg ||
                    affClub?.name ||
                    affId;
                  fields.push({
                    label: 'Affiliate:',
                    value: (
                      <span
                        className="text-[11px] truncate block text-sky-700 font-semibold"
                        title={`Parent: ${pName} (${affId})`}
                      >
                        {affType ? `[${affType}] ` : ''}
                        {pName || '-'}
                      </span>
                    ),
                    align: 'start',
                    isInactive: isInactive('affiliate_club'),
                  });
                }

                if (data.affiliatesCount && data.affiliatesCount > 0) {
                  fields.push({
                    label: 'Teams:',
                    value: `${data.affiliatesCount} affiliates`,
                    align: 'start',
                  });
                }
              } else if (entityTypeStr === 'region') {
                fields.push({
                  label: 'Name:',
                  value: data.name || title,
                  align: 'start',
                  lineClamp: 2,
                });
                if (data.code) {
                  fields.push({
                    label: 'Code:',
                    value: data.code,
                  });
                }
                if (data.citiesCount !== undefined) {
                  fields.push({
                    label: 'Cities:',
                    value: `${data.citiesCount} cities`,
                  });
                }
              } else if (entityTypeStr === 'stage') {
                fields.push({
                  label: 'Name:',
                  value: data.name || title,
                  align: 'start',
                  lineClamp: 2,
                  isInactive: isInactive('name'),
                  isRed: isRedKeyword(data.name || title),
                });
                fields.push({
                  label: 'Type:',
                  value: 'Tournament Stage',
                });
              } else {
                // Default: Competition, Nation, Award, Confederation, etc.
                const lnValue = data.name_lg || (data.is_virtual ? (data.virtual_type === 'EXTINCT' ? '[EXTINCT]' : '[OTHER]') : title);
                fields.push({
                  label: 'LN:',
                  value: lnValue,
                  align: 'start',
                  lineClamp: 2,
                  isInactive:
                    isInactive('name_lg') ||
                    isInactive('name') ||
                    isTitleInactive,
                  isRed: isRedKeyword(lnValue),
                });

                if (hasThreeLetter || data.name_sh || data.is_virtual) {
                  const snValue = data.name_sh || (data.is_virtual ? (data.virtual_type === 'EXTINCT' ? '[EXTINCT]' : '[OTHER]') : title);
                  fields.push({
                    label: 'SN:',
                    value: snValue,
                    align: 'start',
                    lineClamp: 2,
                    isInactive: isInactive('name_sh'),
                    isRed: isRedKeyword(snValue),
                  });
                }

                if (
                  entityTypeStr !== 'award' &&
                  (hasThreeLetter ||
                    data.name_3l ||
                    data.is_virtual)
                ) {
                  const val3 = data.name_3l || code3 || (data.is_virtual ? (data.virtual_type === 'EXTINCT' ? '[EXTINCT]' : '[OTHER]') : '-');
                  fields.push({
                    label: '3N:',
                    value: val3,
                    isInactive: isInactive('name_3l'),
                    isRed: isRedKeyword(val3),
                  });
                }
              }

              return fields;
            };

            const renderedFields: EntityCardField[] = values || getDefaultFields();
            const bodyMinHeightClass =
              entityTypeStr === 'nation' || entityTypeStr === 'city'
                ? 'min-h-[140px]'
                : entityTypeStr === 'stadium'
                  ? 'min-h-[90px]'
                  : entityTypeStr === 'club'
                    ? 'min-h-[160px]'
                    : 'min-h-[120px]';

            return (
              /* Fields List: Stack label on top of value for small/2-column cards; 1-line (1:3 ratio) for large */
              <div
                className={`flex flex-col gap-2 mb-1 text-xs ${bodyMinHeightClass} justify-start`}
              >
                {renderedFields.map((field, idx) => {
                  const isNode = React.isValidElement(field.value);

                  // 2 Line layout (Small card / 2 columns / 2-line style)
                  if (isSmall || is2Line) {
                    return (
                      <div key={idx} className="flex flex-col min-w-0">
                        <span
                          className={`text-[11px] font-semibold select-none leading-none mb-1 tracking-wider block ${
                            field.isInactive
                              ? 'text-red-600 font-semibold'
                              : 'text-slate-400'
                          }`}
                        >
                          {field.label}
                        </span>
                        <div className="min-w-0">
                          {isNode ? (
                            field.value
                          ) : (
                            <span
                              className={`font-bold text-xs sm:text-[13px] leading-snug whitespace-normal break-words min-w-0 block ${
                                field.isInactive || field.isRed ? 'text-red-600' : 'text-slate-900'
                              }`}
                              title={
                                field.title ||
                                (typeof field.value === 'string' ? field.value : undefined)
                              }
                            >
                              {field.value}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // 1-Line layout: [LN:] [Value] (Tỉ lệ label : value = 1 : 3, khoảng cách dòng đều nhau)
                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-2.5 min-w-0"
                    >
                      <span
                        className={`text-xs font-semibold select-none leading-snug truncate ${
                          field.isInactive
                            ? 'text-red-600 font-semibold'
                            : 'text-slate-400'
                        }`}
                      >
                        {field.label}
                      </span>
                      <div className="min-w-0">
                        {isNode ? (
                          field.value
                        ) : (
                          <span
                            className={`font-bold text-xs sm:text-[13px] leading-snug whitespace-normal break-words min-w-0 block ${
                              field.isInactive || field.isRed ? 'text-red-600' : 'text-slate-800'
                            }`}
                            title={
                              field.title ||
                              (typeof field.value === 'string' ? field.value : undefined)
                            }
                          >
                            {field.value}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

      </div>

      {/* Unified Record Detail + Edit Modal */}
      <RecordDetailModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        data={data}
        type={type}
        initialMode={modalMode}
        onDelete={onDelete}
        onEdit={onEdit}
      />
    </>
  );
}
