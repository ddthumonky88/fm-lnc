'use client';

import React, { useState } from 'react';
import { Modal, Descriptions, Tag, Button, Tooltip, message, Divider } from 'antd';
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

  const inactiveList = (data.inactive_fields || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);

  const isFieldInactive = (field: string) => inactiveList.includes(field.toLowerCase());

  // Determine Title & Subtitle
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

  const getTypeIcon = () => {
    if (isVirtual) return <SafetyOutlined className="text-orange-500" />;
    if (isComp) return <TrophyOutlined className="text-amber-500" />;
    if (isClub) return <SafetyOutlined className="text-blue-500" />;
    if (isNation) return <FlagOutlined className="text-red-500" />;
    if (isConfed) return <GlobalOutlined className="text-indigo-500" />;
    if (isStadium) return <BankOutlined className="text-emerald-500" />;
    if (isCity) return <EnvironmentOutlined className="text-indigo-500" />;
    if (type === 'award' || type === EntityType.AWARD) return <StarOutlined className="text-yellow-500" />;
    if (isPlayer) return <UserOutlined className="text-purple-500" />;
    return <AppstoreOutlined className="text-gray-500" />;
  };

  const nationId = data.nation_id || data.country_id || data.nation?.id;
  const nationName = data.nation_name || data.nation?.long_name || data.nation?.name;
  const nationCode = data.nation_three_letter || data.nation?.three_letter_name;

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
        >
          Close
        </Button>,
      ]}
      width={680}
      destroyOnClose
      centered
      title={
        <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100 pr-6">
          <span className="text-xl shrink-0">{getTypeIcon()}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-base text-gray-900 truncate">{title}</span>
              <Tag
                color={
                  isVirtual
                    ? data.virtual_type === 'EXTINCT' || data.id === '[EXTINCT]'
                      ? 'volcano'
                      : 'geekblue'
                    : 'blue'
                }
                className="font-bold m-0 text-xs shrink-0"
              >
                {data.id}
              </Tag>
              <Tooltip title="Copy ID">
                <Button
                  type="text"
                  size="small"
                  shape="circle"
                  icon={copied ? <CheckOutlined className="text-green-500 text-xs" /> : <CopyOutlined className="text-gray-400 text-xs" />}
                  onClick={handleCopyId}
                  className="hover:bg-gray-100"
                />
              </Tooltip>
              <Tag color="cyan" className="text-xs m-0 font-medium">
                {getTypeLabel()}
              </Tag>
            </div>
          </div>
        </div>
      }
    >
      <div className="py-2 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Banner with flags/logos if available */}
        {(nationId || isConfed) && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {nationId ? (
                <img
                  src={getNationLogoUrl(nationId, nationCode)}
                  alt={nationName || 'Nation'}
                  className="w-9 h-6 object-cover rounded shadow-2xs border border-slate-300 shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : isConfed ? (
                <img
                  src={getConfederationLogoUrl(data.id)}
                  alt={data.name || 'Confederation'}
                  className="w-8 h-8 object-contain rounded bg-white shadow-2xs border border-slate-200 shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
              <div>
                <div className="font-semibold text-xs text-slate-500 uppercase tracking-wider">
                  {isConfed ? 'Confederation' : 'Associated Nation'}
                </div>
                <div className="font-bold text-sm text-slate-800">
                  {nationName || data.name} {nationCode && <span className="text-slate-500 font-normal">({nationCode})</span>}
                </div>
              </div>
            </div>
            {nationId && (
              <Tag color="blue" className="m-0 text-xs">
                Nation ID: {nationId}
              </Tag>
            )}
          </div>
        )}

        {/* Color Preview Block for Competitions / Clubs */}
        {(bgInfo || fgInfo) && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Color Configuration
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {/* Visual preview pill */}
              <div
                className="px-4 py-1.5 rounded-md font-bold text-xs border border-black/15 shadow-2xs"
                style={{
                  backgroundColor: bgInfo ? bgInfo.css : '#ffffff',
                  color: fgInfo ? fgInfo.css : '#000000',
                }}
              >
                Sample Text Preview
              </div>

              {/* Background info */}
              {bgInfo && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span
                    className="w-4 h-4 rounded border border-black/20 shrink-0 shadow-2xs"
                    style={{ backgroundColor: bgInfo.css }}
                  />
                  <span className="text-slate-500">Background:</span>
                  <span className="font-mono font-semibold text-slate-800">{bgInfo.hex}</span>
                  <span className="text-slate-400 font-mono text-[11px]">({data.bg_color})</span>
                </div>
              )}

              {/* Foreground info */}
              {fgInfo && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span
                    className="w-4 h-4 rounded border border-black/20 shrink-0 shadow-2xs"
                    style={{ backgroundColor: fgInfo.css }}
                  />
                  <span className="text-slate-500">Foreground:</span>
                  <span className="font-mono font-semibold text-slate-800">{fgInfo.hex}</span>
                  <span className="text-slate-400 font-mono text-[11px]">({data.fg_color})</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Detailed Fields Table */}
        <Descriptions
          bordered
          size="small"
          column={{ xs: 1, sm: 2 }}
          labelStyle={{ width: '130px', fontWeight: 600, color: '#475569', backgroundColor: '#f8fafc' }}
        >
          <Descriptions.Item label="FM ID">
            <span className="font-mono font-bold text-blue-600">{data.id}</span>
          </Descriptions.Item>

          <Descriptions.Item label="Record Type">
            <Tag color="cyan" className="font-semibold m-0">
              {getTypeLabel()}
            </Tag>
          </Descriptions.Item>

          {/* Names */}
          {isPlayer ? (
            <>
              <Descriptions.Item label="First Name (FN)">
                <span className="font-semibold text-gray-800">{data.first_name || '-'}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Second Name (SN)">
                <span className="font-semibold text-gray-800">{data.second_name || '-'}</span>
              </Descriptions.Item>
              {data.common_name && (
                <Descriptions.Item label="Common Name (CN)" span={2}>
                  <span className="font-semibold text-purple-700 italic">{data.common_name}</span>
                </Descriptions.Item>
              )}
            </>
          ) : isCity || isStadium ? (
            <Descriptions.Item label="Name" span={2}>
              <span className="font-bold text-gray-800">{data.name || data.long_name || '-'}</span>
            </Descriptions.Item>
          ) : (
            <>
              <Descriptions.Item label="Long Name (LN)" span={2}>
                <span className={`font-semibold ${isFieldInactive('long_name') ? 'line-through text-red-500' : 'text-gray-900'}`}>
                  {data.long_name || data.name || '-'}
                </span>
                {isFieldInactive('long_name') && <Tag color="error" className="ml-2 text-xs">Inactive</Tag>}
              </Descriptions.Item>

              <Descriptions.Item label="Short Name (SN)">
                <span className={`font-semibold ${isFieldInactive('short_name') ? 'line-through text-red-500' : 'text-gray-900'}`}>
                  {data.short_name || '-'}
                </span>
                {isFieldInactive('short_name') && <Tag color="error" className="ml-2 text-xs">Inactive</Tag>}
              </Descriptions.Item>

              <Descriptions.Item label="3-Letter Code (3N)">
                <span className={`font-mono font-bold ${isFieldInactive('three_letter_name') ? 'line-through text-red-500' : 'text-slate-800'}`}>
                  {data.three_letter_name || '-'}
                </span>
                {isFieldInactive('three_letter_name') && <Tag color="error" className="ml-2 text-xs">Inactive</Tag>}
              </Descriptions.Item>

              {data.six_letter_name !== undefined && (
                <Descriptions.Item label="6-Letter Code (6N)" span={2}>
                  <span className={`font-mono font-bold ${isFieldInactive('six_letter_name') ? 'line-through text-red-500' : 'text-slate-800'}`}>
                    {data.six_letter_name || '-'}
                  </span>
                  {isFieldInactive('six_letter_name') && <Tag color="error" className="ml-2 text-xs">Inactive</Tag>}
                </Descriptions.Item>
              )}
            </>
          )}

          {/* Categories */}
          {data.categories && (
            <Descriptions.Item label={isCity ? 'Region' : 'Category'} span={2}>
              <div className="flex items-center gap-1 flex-wrap">
                {String(data.categories)
                  .split(',')
                  .map((cat: string, idx: number) => (
                    <Tag color="cyan" key={idx} className="m-0 font-medium">
                      {cat.trim()}
                    </Tag>
                  ))}
              </div>
            </Descriptions.Item>
          )}

          {/* Competition assignment for club */}
          {data.comp_id && (
            <Descriptions.Item label="Competition" span={2}>
              <span className="font-medium text-slate-800">
                {data.competition?.long_name || data.comp_name || `Competition ID: ${data.comp_id}`}
              </span>
              <Tag color="blue" className="ml-2 text-xs">
                ID: {data.comp_id}
              </Tag>
            </Descriptions.Item>
          )}

          {/* Flags / Boolean Attributes */}
          {(data.is_international !== undefined || data.is_extinct !== undefined || isVirtual) && (
            <Descriptions.Item label="Status / Scope" span={2}>
              <div className="flex items-center gap-1.5 flex-wrap">
                {data.is_international && <Tag color="purple">International Competition</Tag>}
                {data.is_extinct && <Tag color="red">Extinct / Inactive Club</Tag>}
                {isVirtual && (
                  <Tag color="orange">
                    {data.virtual_type === 'EXTINCT' ? 'Extinct Clubs Container' : 'Independent Clubs Container'}
                  </Tag>
                )}
              </div>
            </Descriptions.Item>
          )}

          {/* Counts */}
          {data.clubsCount !== undefined && (
            <Descriptions.Item label="Clubs Count">
              <span className="font-bold text-blue-600">{data.clubsCount} clubs</span>
            </Descriptions.Item>
          )}

          {data.awardsCount !== undefined && (
            <Descriptions.Item label="Awards Count">
              <span className="font-bold text-amber-600">{data.awardsCount} awards</span>
            </Descriptions.Item>
          )}

          {data.totalComps !== undefined && (
            <Descriptions.Item label="Total Competitions">
              <span className="font-bold text-amber-600">{data.totalComps}</span>
            </Descriptions.Item>
          )}

          {data.totalNations !== undefined && (
            <Descriptions.Item label="Total Nations">
              <span className="font-bold text-blue-600">{data.totalNations}</span>
            </Descriptions.Item>
          )}

          {/* Note */}
          {data.note && (
            <Descriptions.Item label="Note" span={2}>
              <span className="text-slate-700 italic">{data.note}</span>
            </Descriptions.Item>
          )}

          {/* Inactive Fields List */}
          {inactiveList.length > 0 && (
            <Descriptions.Item label="Inactive Fields" span={2}>
              <div className="flex items-center gap-1 flex-wrap">
                {inactiveList.map((f: string, i: number) => (
                  <Tag color="error" key={i}>
                    {f}
                  </Tag>
                ))}
              </div>
            </Descriptions.Item>
          )}
        </Descriptions>

        {/* Collapsible Raw JSON Viewer */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowJson(!showJson);
            }}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <InfoCircleOutlined className="text-blue-500" />
              <span>Technical Data (Raw JSON)</span>
            </span>
            <span className="text-slate-400">{showJson ? 'Hide ▲' : 'Show ▼'}</span>
          </button>
          {showJson && (
            <div className="p-3 bg-slate-900 text-slate-200 text-xs font-mono max-h-48 overflow-auto">
              <pre className="m-0">{JSON.stringify(data, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
