'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Tag, Button, Tooltip, Input, Checkbox, message, Space, Divider } from 'antd';
import {
  CopyOutlined,
  CheckOutlined,
  EditOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
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
  BgColorsOutlined,
} from '@ant-design/icons';
import { EntityType, RecordType } from '../types';
import {
  getConfederationLogoUrl,
  getNationLogoUrl,
  createRecord,
  updateRecord,
} from '../services/api';
import { useApp } from '../context/AppContext';

export interface RecordDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  type: EntityType | RecordType | string;
  initialMode?: 'view' | 'edit' | 'create';
  onEdit?: (record?: any) => void;
  onSuccess?: () => void;
  defaultNationId?: string | number;
  defaultCompId?: string | number;
  defaultParentId?: string | number;
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
  initialMode = 'view',
  onEdit,
  onSuccess,
  defaultNationId,
  defaultCompId,
  defaultParentId,
}: RecordDetailModalProps) {
  const { triggerRefresh } = useApp();

  const isCreate = !data || initialMode === 'create';
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>(
    isCreate ? 'create' : initialMode === 'edit' ? 'edit' : 'view'
  );
  const [copied, setCopied] = useState(false);
  const [currentData, setCurrentData] = useState<any>(data || {});
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<any>({
    id: '',
    long_name: '',
    short_name: '',
    three_letter_name: '',
    six_letter_name: '',
    first_name: '',
    second_name: '',
    common_name: '',
    name: '',
    fg_color: '',
    bg_color: '',
    categories: '',
    is_international: false,
    is_extinct: false,
    note: '',
    nation_id: defaultNationId ? String(defaultNationId) : null,
    comp_id: defaultCompId ? String(defaultCompId) : null,
    parent_id: defaultParentId ? String(defaultParentId) : '',
  });

  useEffect(() => {
    if (isOpen) {
      const activeData = data || {};
      setCurrentData(activeData);
      setMode(isCreate ? 'create' : initialMode === 'edit' ? 'edit' : 'view');
      setErrorMessage(null);

      setFormData({
        id: activeData.id !== undefined && activeData.id !== null ? String(activeData.id) : '',
        long_name: activeData.long_name || '',
        short_name: activeData.short_name || '',
        three_letter_name: activeData.three_letter_name || activeData.code || '',
        six_letter_name: activeData.six_letter_name || '',
        first_name: activeData.first_name || '',
        second_name: activeData.second_name || '',
        common_name: activeData.common_name || '',
        name: activeData.name || activeData.long_name || '',
        fg_color: activeData.fg_color || '',
        bg_color: activeData.bg_color || '',
        categories: activeData.categories || '',
        is_international: !!activeData.is_international,
        is_extinct: !!activeData.is_extinct,
        note: activeData.note || '',
        nation_id: activeData.nation_id ? String(activeData.nation_id) : (defaultNationId ? String(defaultNationId) : null),
        comp_id: activeData.comp_id ? String(activeData.comp_id) : (defaultCompId ? String(defaultCompId) : null),
        parent_id: activeData.parent_id ? String(activeData.parent_id) : (defaultParentId ? String(defaultParentId) : ''),
      });
    }
  }, [isOpen, data, initialMode, isCreate, defaultNationId, defaultCompId, defaultParentId]);

  if (!isOpen) return null;

  const bgInfo = parseColor(currentData.bg_color);
  const fgInfo = parseColor(currentData.fg_color);

  const previewBgInfo = parseColor(formData.bg_color);
  const previewFgInfo = parseColor(formData.fg_color);

  const handleCopyId = (e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    if (currentData.id !== undefined && currentData.id !== null) {
      navigator.clipboard.writeText(String(currentData.id));
      setCopied(true);
      message.success(`Copied ID: ${currentData.id}`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const inactiveList = (currentData.inactive_fields || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);

  const isFieldInactive = (field: string) => inactiveList.includes(field.toLowerCase());

  // Determine Type Flags
  const isPlayer = type === 'player' || type === EntityType.PLAYER || type === RecordType.PLAYER;
  const isCity = type === 'city' || type === EntityType.CITY || type === RecordType.CITY;
  const isStadium = type === 'stadium' || type === EntityType.STADIUM || type === RecordType.STADIUM;
  const isComp = type === 'competition' || type === EntityType.COMPETITION || type === RecordType.COMPETITION;
  const isClub = type === 'club' || type === EntityType.CLUB || type === RecordType.CLUB;
  const isNation = type === 'nation' || type === EntityType.NATION;
  const isConfed = type === 'confederation' || type === EntityType.CONFEDERATION;
  const isStage = type === 'stage' || type === EntityType.STAGE || type === RecordType.STAGE;
  const isAward = type === 'award' || type === EntityType.AWARD || type === RecordType.AWARD;
  const isVirtual = Boolean(currentData.is_virtual || currentData.id === '[EXTINCT]' || currentData.id === '[OTHER]');

  const canEdit = !isVirtual && !isConfed;

  const title = isPlayer
    ? `${currentData.first_name || ''} ${currentData.second_name || ''}`.trim() || currentData.common_name || 'Unnamed Player'
    : isVirtual
    ? currentData.virtual_type === 'EXTINCT' || currentData.id === '[EXTINCT]'
      ? 'Extinct Clubs'
      : 'Other Clubs'
    : currentData.long_name || currentData.name || 'Unnamed';

  const getTypeLabel = () => {
    if (isVirtual) return 'Virtual Group';
    if (isClub) return 'Club';
    if (isComp) return 'Competition';
    if (isNation) return 'Nation';
    if (isConfed) return 'Confederation';
    if (isStadium) return 'Stadium';
    if (isCity) return 'City';
    if (isAward) return 'Award';
    if (isPlayer) return 'Person / Player';
    if (isStage) return 'Stage';
    return String(type).toUpperCase();
  };

  const getTypeColor = () => {
    if (isVirtual) return currentData.virtual_type === 'EXTINCT' || currentData.id === '[EXTINCT]' ? 'volcano' : 'geekblue';
    if (isComp) return 'gold';
    if (isClub) return 'blue';
    if (isNation) return 'cyan';
    if (isPlayer) return 'purple';
    if (isStadium) return 'green';
    if (isCity) return 'geekblue';
    if (isAward) return 'warning';
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
    if (isAward) return <StarOutlined className="text-yellow-500" />;
    if (isPlayer) return <UserOutlined className="text-purple-500" />;
    return <AppstoreOutlined className="text-gray-500" />;
  };

  // Nation resolving: If it's a nation, currentData.id is the nation id
  const nationId = isNation ? currentData.id : (currentData.nation_id || currentData.country_id || currentData.nation?.id);
  const nationName = isNation ? (currentData.long_name || currentData.name) : (currentData.nation_name || currentData.nation?.long_name || currentData.nation?.name);
  const nationCode = isNation ? (currentData.three_letter_name || currentData.code) : (currentData.nation_three_letter || currentData.nation?.three_letter_name);

  // Normalize API Record Type
  const getNormalizedRecordType = (): RecordType => {
    if (isComp) return RecordType.COMPETITION;
    if (isClub) return RecordType.CLUB;
    if (isStadium) return RecordType.STADIUM;
    if (isCity) return RecordType.CITY;
    if (isAward) return RecordType.AWARD;
    if (isPlayer) return RecordType.PLAYER;
    if (isStage) return RecordType.STAGE;
    return RecordType.COMPETITION;
  };

  // Handle Save (Create or Update)
  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const recType = getNormalizedRecordType();
      const payload: any = { ...formData };

      if (mode === 'create') {
        payload.id = String(formData.id || '').trim();
        if (!payload.id) {
          throw new Error('FM ID is required');
        }
      }

      // Validations
      if (isCity || isStadium || isStage) {
        if (!payload.name?.trim()) throw new Error('Please enter Name');
      } else if (isPlayer) {
        if (!payload.first_name?.trim()) throw new Error('Please enter First Name');
        if (!payload.second_name?.trim()) throw new Error('Please enter Second Name');
      } else {
        if (!payload.long_name?.trim()) throw new Error('Please enter Long Name (LN)');
        if (!payload.short_name?.trim()) payload.short_name = payload.long_name;
      }

      if (isComp) {
        payload.fg_color = payload.fg_color?.trim() || null;
        payload.bg_color = payload.bg_color?.trim() || null;
        payload.parent_id = formData.parent_id?.trim() ? String(formData.parent_id).trim() : null;
      }

      if (mode === 'create') {
        await createRecord(recType, payload);
        message.success('Record created successfully!');
        triggerRefresh();
        onSuccess?.();
        onClose();
      } else {
        await updateRecord(recType, String(currentData.id), payload);
        message.success('Record updated successfully!');
        const updated = { ...currentData, ...payload };
        setCurrentData(updated);
        triggerRefresh();
        onSuccess?.();
        setMode('view');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to save record');
      message.error(err.message || 'Failed to save record');
    } finally {
      setIsSaving(false);
    }
  };

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
      width="100%"
      style={{ maxWidth: 600 }}
      destroyOnHidden
      centered
      className="max-w-[calc(100vw-24px)] mx-auto"
      title={
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 pr-6">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Main Flag or Logo / Icon */}
            {isNation && nationId ? (
              <img
                src={getNationLogoUrl(nationId, nationCode)}
                alt={title}
                className="w-10 sm:w-12 h-7 sm:h-8 object-cover rounded shadow-xs border border-slate-200/90 bg-white shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : isConfed ? (
              <img
                src={getConfederationLogoUrl(currentData.id)}
                alt={currentData.name || 'Confederation'}
                className="w-8 sm:w-9 h-8 sm:h-9 object-contain rounded-lg p-1 bg-white shadow-xs border border-slate-200 shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div
                className={`w-8 sm:w-9 h-8 sm:h-9 rounded-lg flex items-center justify-center text-sm sm:text-base shrink-0 border ${
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
              <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate m-0 leading-tight">
                {mode === 'create' ? `Add New ${getTypeLabel()}` : mode === 'edit' ? `Edit: ${title}` : title}
              </h3>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                {/* FM ID */}
                {!isCreate && (
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer group"
                    title="Click to copy FM ID"
                  >
                    <span className="text-blue-400 font-medium">ID:</span>
                    <span>{currentData.id}</span>
                    {copied ? (
                      <CheckOutlined className="text-emerald-600 text-[10px]" />
                    ) : (
                      <CopyOutlined className="text-blue-400 group-hover:text-blue-600 text-[10px]" />
                    )}
                  </button>
                )}

                {/* Type Badge */}
                <Tag color={getTypeColor()} className="m-0 font-semibold text-[11px] border-0">
                  {getTypeLabel()}
                </Tag>

                {/* 3-Letter Code Badge */}
                {nationCode && (
                  <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {nationCode}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Mode Switcher Toggle in Header */}
          {canEdit && mode === 'view' && (
            <Button
              type="primary"
              size="small"
              icon={<EditOutlined />}
              onClick={() => setMode('edit')}
              className="shrink-0 text-xs font-medium shadow-xs"
            >
              <span className="hidden sm:inline">Edit</span>
            </Button>
          )}

          {canEdit && mode === 'edit' && !isCreate && (
            <Button
              size="small"
              icon={<ArrowLeftOutlined />}
              onClick={() => setMode('view')}
              className="shrink-0 text-xs font-medium"
            >
              <span className="hidden sm:inline">Details</span>
            </Button>
          )}
        </div>
      }
      footer={
        mode === 'view' ? (
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            {canEdit && (
              <Button
                key="edit"
                type="primary"
                icon={<EditOutlined />}
                onClick={() => setMode('edit')}
                className="font-medium px-4 h-9 shadow-sm"
              >
                Edit
              </Button>
            )}
            <Button
              key="close"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="font-medium px-4 h-9"
            >
              Close
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              key="cancel"
              onClick={() => {
                if (isCreate) onClose();
                else setMode('view');
              }}
              className="font-medium px-4 h-9"
            >
              Cancel
            </Button>
            <Button
              key="save"
              type="primary"
              icon={<SaveOutlined />}
              loading={isSaving}
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 font-medium px-4 h-9 shadow-sm"
            >
              {isCreate ? 'Create' : 'Save Changes'}
            </Button>
          </div>
        )
      }
    >
      <div className="py-2.5 max-h-[72vh] overflow-y-auto pr-1">
        {errorMessage && (
          <div className="bg-red-50 text-red-600 border border-red-200 rounded p-2.5 text-xs mb-3">
            {errorMessage}
          </div>
        )}

        {/* 1. VIEW MODE: [label]: [Value] */}
        {mode === 'view' ? (
          <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-3 sm:p-3.5 space-y-2">
            {/* ID */}
            <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
              <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                ID:
              </span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-sm text-blue-600 min-w-0">
                <span>{currentData.id}</span>
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
                <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
                  <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                    FN:
                  </span>
                  <span className="font-bold text-[13px] text-slate-800 break-words flex-1">
                    {currentData.first_name || '-'}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
                  <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                    SN:
                  </span>
                  <span className="font-bold text-[13px] text-slate-800 break-words flex-1">
                    {currentData.second_name || '-'}
                  </span>
                </div>

                {currentData.common_name && (
                  <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
                    <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                      CN:
                    </span>
                    <span className="font-bold text-[13px] text-purple-700 italic break-words flex-1">
                      {currentData.common_name}
                    </span>
                  </div>
                )}
              </>
            ) : isCity || isStadium ? (
              <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
                <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                  Name:
                </span>
                <span className="font-bold text-[13px] text-slate-800 break-words flex-1">
                  {currentData.name || currentData.long_name || '-'}
                </span>
              </div>
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
                      {currentData.is_virtual ? '-' : (currentData.long_name || currentData.name || title)}
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
                      {currentData.is_virtual ? '-' : (currentData.short_name || '-')}
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
                      {currentData.is_virtual ? '-' : (currentData.three_letter_name || nationCode || '-')}
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
                  currentData.six_letter_name !== undefined) && (
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
                        {currentData.six_letter_name || '-'}
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

            {/* Associated Nation */}
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

            {/* Assigned Competition */}
            {currentData.comp_id && (
              <div className="flex items-center gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
                <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                  League:
                </span>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <TrophyOutlined className="text-amber-500 text-xs shrink-0" />
                  <span className="font-bold text-[13px] text-slate-800 truncate">
                    {currentData.competition?.long_name || currentData.comp_name || `Competition ${currentData.comp_id}`}
                  </span>
                  <span className="text-xs text-slate-400 font-mono ml-auto shrink-0">
                    ID: {currentData.comp_id}
                  </span>
                </div>
              </div>
            )}

            {/* Sub-competitions count */}
            {isComp && currentData.childrenCount !== undefined && currentData.childrenCount > 0 && (
              <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
                <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                  Sub-Comps:
                </span>
                <span className="font-bold text-[13px] text-amber-600">
                  {currentData.childrenCount} Sub-Competitions
                </span>
              </div>
            )}

            {/* Total Competitions for Nation */}
            {currentData.totalComps !== undefined && (
              <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
                <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                  Comps:
                </span>
                <span className="font-bold text-[13px] text-amber-700">
                  {currentData.totalComps} Competitions
                </span>
              </div>
            )}

            {/* Clubs Count */}
            {currentData.clubsCount !== undefined && (
              <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
                <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                  Clubs:
                </span>
                <span className="font-bold text-[13px] text-blue-700">
                  {currentData.clubsCount} Clubs
                </span>
              </div>
            )}

            {/* Awards Count */}
            {currentData.awardsCount !== undefined && (
              <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
                <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                  Awards:
                </span>
                <span className="font-bold text-[13px] text-amber-700">
                  {currentData.awardsCount} Awards
                </span>
              </div>
            )}

            {/* Total Nations */}
            {currentData.totalNations !== undefined && (
              <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
                <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                  Nations:
                </span>
                <span className="font-bold text-[13px] text-cyan-700">
                  {currentData.totalNations} Member Nations
                </span>
              </div>
            )}

            {/* Colors */}
            {(bgInfo || fgInfo) && (
              <div className="flex items-center gap-2 min-w-0 pb-1.5 border-b border-slate-200/60 flex-wrap">
                <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                  Colors:
                </span>
                <div className="flex items-center gap-2 flex-wrap flex-1">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold border border-black/15 shadow-2xs"
                    style={{
                      backgroundColor: bgInfo ? bgInfo.css : '#ffffff',
                      color: fgInfo ? fgInfo.css : '#000000',
                    }}
                  >
                    Sample
                  </span>

                  {bgInfo && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      <span
                        className="w-3.5 h-3.5 rounded border border-black/20 shrink-0"
                        style={{ backgroundColor: bgInfo.css }}
                      />
                      <span className="text-slate-400">BG:</span>
                      <span className="font-mono font-bold text-slate-800">{bgInfo.hex}</span>
                      <span className="text-slate-400 font-mono text-[11px]">({currentData.bg_color})</span>
                    </span>
                  )}

                  {fgInfo && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      <span
                        className="w-3.5 h-3.5 rounded border border-black/20 shrink-0"
                        style={{ backgroundColor: fgInfo.css }}
                      />
                      <span className="text-slate-400">FG:</span>
                      <span className="font-mono font-bold text-slate-800">{fgInfo.hex}</span>
                      <span className="text-slate-400 font-mono text-[11px]">({currentData.fg_color})</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Scope / Status */}
            {(currentData.is_international !== undefined || currentData.is_extinct !== undefined || isVirtual) && (
              <div className="flex items-center gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
                <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                  Status:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap flex-1">
                  {currentData.is_international && (
                    <Tag color="purple" className="m-0 text-xs font-medium">
                      International Competition
                    </Tag>
                  )}
                  {currentData.is_extinct && (
                    <Tag color="red" className="m-0 text-xs font-medium">
                      Extinct Club
                    </Tag>
                  )}
                  {isVirtual && (
                    <Tag color="orange" className="m-0 text-xs font-medium">
                      {currentData.virtual_type === 'EXTINCT' ? 'Extinct Clubs Container' : 'Independent Clubs Container'}
                    </Tag>
                  )}
                </div>
              </div>
            )}

            {/* Categories */}
            {currentData.categories && (
              <div className="flex items-center gap-2 min-w-0 pb-1.5 border-b border-slate-200/60">
                <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                  {isCity ? 'Region:' : 'Category:'}
                </span>
                <div className="flex items-center gap-1 flex-wrap flex-1">
                  {String(currentData.categories)
                    .split(',')
                    .map((cat: string, idx: number) => (
                      <Tag color="cyan" key={idx} className="m-0 text-xs font-medium">
                        {cat.trim()}
                      </Tag>
                    ))}
                </div>
              </div>
            )}

            {/* Note */}
            {currentData.note && (
              <div className="flex items-baseline gap-2 min-w-0 pb-1.5 border-b border-slate-200/60 last:border-b-0">
                <span className="w-20 text-slate-400 font-semibold text-xs shrink-0 select-none">
                  Note:
                </span>
                <span className="text-xs text-slate-700 italic flex-1 break-words">
                  {currentData.note}
                </span>
              </div>
            )}

            {/* Inactive Fields */}
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
        ) : (
          /* 2. EDIT / CREATE MODE: INLINE FORM */
          <form onSubmit={handleSave} className="space-y-3.5">
            {/* FM Unique ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                FM Unique ID <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                disabled={mode === 'edit'}
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                placeholder="e.g. 102422"
                className="font-mono"
                required
              />
            </div>

            {/* Player Specific Fields */}
            {isPlayer ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      First Name (FN) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="e.g. Cristiano"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Second Name (SN) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.second_name}
                      onChange={(e) => setFormData({ ...formData, second_name: e.target.value })}
                      placeholder="e.g. Ronaldo"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Common Name (CN / Nickname)
                  </label>
                  <Input
                    value={formData.common_name}
                    onChange={(e) => setFormData({ ...formData, common_name: e.target.value })}
                    placeholder="e.g. Ronaldo / Kaka"
                  />
                </div>
              </div>
            ) : isCity || isStadium || isStage ? (
              /* Name for Stadium, City, Stage */
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value, long_name: e.target.value })}
                  placeholder="e.g. Wembley Stadium / London"
                  required
                />
              </div>
            ) : (
              /* Club / Competition / Award / Nation Fields */
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Long Name (LN) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.long_name}
                    onChange={(e) => setFormData({ ...formData, long_name: e.target.value })}
                    placeholder="e.g. Manchester United"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Short Name (SN)
                    </label>
                    <Input
                      value={formData.short_name}
                      onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                      placeholder="e.g. Man Utd"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      3-Letter Code (3N)
                    </label>
                    <Input
                      value={formData.three_letter_name}
                      onChange={(e) => setFormData({ ...formData, three_letter_name: e.target.value.toUpperCase() })}
                      placeholder="e.g. MUN"
                      maxLength={3}
                      className="font-mono uppercase"
                    />
                  </div>
                </div>

                {(isClub || type === 'club' || type === EntityType.CLUB) && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      6-Letter Code (6N)
                    </label>
                    <Input
                      value={formData.six_letter_name}
                      onChange={(e) => setFormData({ ...formData, six_letter_name: e.target.value })}
                      placeholder="e.g. MANUTD"
                      maxLength={6}
                      className="font-mono"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Competition Colors with interactive live preview */}
            {isComp && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <BgColorsOutlined className="text-amber-500" /> Competition Colors (RGB Format: R G B)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Background Color (BG)
                    </label>
                    <Input
                      value={formData.bg_color}
                      onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })}
                      placeholder="e.g. 0 51 102"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Foreground Color (FG)
                    </label>
                    <Input
                      value={formData.fg_color}
                      onChange={(e) => setFormData({ ...formData, fg_color: e.target.value })}
                      placeholder="e.g. 255 255 255"
                      className="font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Live Preview Box */}
                {(previewBgInfo || previewFgInfo) && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                    <span className="text-[11px] text-slate-400 font-medium">Live Preview:</span>
                    <span
                      className="px-2.5 py-0.5 rounded text-xs font-bold border border-black/15 shadow-2xs"
                      style={{
                        backgroundColor: previewBgInfo ? previewBgInfo.css : '#ffffff',
                        color: previewFgInfo ? previewFgInfo.css : '#000000',
                      }}
                    >
                      {formData.short_name || formData.long_name || 'Preview Title'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Competition Categories */}
            {isComp && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Categories (comma-separated)
                </label>
                <Input
                  value={formData.categories}
                  onChange={(e) => setFormData({ ...formData, categories: e.target.value })}
                  placeholder="e.g. NATIONAL_TEAM,CONTINENTAL"
                />
              </div>
            )}

            {/* Competition Parent ID */}
            {isComp && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Parent Competition ID (COMP_PARENT_ID)
                </label>
                <Input
                  value={formData.parent_id || ''}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  placeholder="e.g. 1301416 (Leave blank if none)"
                  className="font-mono text-xs"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Assign this competition as a sub-stage or sub-competition of another parent competition.
                </span>
              </div>
            )}

            {/* Checkboxes: International / Extinct */}
            <div className="flex items-center gap-4 flex-wrap pt-1">
              {isComp && (
                <Checkbox
                  checked={formData.is_international}
                  onChange={(e) => setFormData({ ...formData, is_international: e.target.checked })}
                >
                  <span className="text-xs text-slate-700 font-medium">International Competition</span>
                </Checkbox>
              )}
              {isClub && (
                <Checkbox
                  checked={formData.is_extinct}
                  onChange={(e) => setFormData({ ...formData, is_extinct: e.target.checked })}
                >
                  <span className="text-xs text-slate-700 font-medium">Extinct Club</span>
                </Checkbox>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Note
              </label>
              <Input.TextArea
                rows={2}
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Optional notes or details..."
                className="text-xs"
              />
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
