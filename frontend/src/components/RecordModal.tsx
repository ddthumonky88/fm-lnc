'use client';

import React, { useState, useEffect } from 'react';
import { createRecord, updateRecord } from '../services/api';
import { RecordType } from '../types';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  type: RecordType | 'competition' | 'club' | 'stadium' | 'city' | 'award' | 'player' | 'stage';
  initialData?: any;
  defaultNationId?: number;
  defaultCompId?: number;
}

export default function RecordModal({
  isOpen,
  onClose,
  onSuccess,
  type,
  initialData,
  defaultNationId,
  defaultCompId,
}: RecordModalProps) {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState<any>({
    id: '',
    first_name: '',
    common_name: '',
    second_name: '',
    long_name: '',
    short_name: '',
    three_letter_name: '',
    six_letter_name: '',
    name: '',
    note: '',
    fg_color: '',
    bg_color: '',
    categories: '',
    is_international: false,
    is_extinct: false,
    nation_id: defaultNationId || null,
    comp_id: defaultCompId || null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        id: initialData.id,
        first_name: initialData.first_name || '',
        common_name: initialData.common_name || '',
        second_name: initialData.second_name || '',
        is_extinct: !!initialData.is_extinct,
        name: initialData.name || initialData.long_name || '',
      });
    } else {
      setFormData({
        id: '',
        first_name: '',
        common_name: '',
        second_name: '',
        long_name: '',
        short_name: '',
        three_letter_name: '',
        six_letter_name: '',
        name: '',
        note: '',
        fg_color: '',
        bg_color: '',
        categories: '',
        is_international: false,
        is_extinct: false,
        nation_id: defaultNationId || null,
        comp_id: defaultCompId || null,
      });
    }
    setError(null);
  }, [initialData, defaultNationId, defaultCompId, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: any = { ...formData };
      if (!isEdit) {
        payload.id = parseInt(formData.id, 10);
        if (isNaN(payload.id)) {
          throw new Error('FM ID must be a valid number');
        }
      }

      if (type === RecordType.STADIUM || type === RecordType.CITY || type === RecordType.STAGE) {
        if (!payload.name) throw new Error('Please enter Name');
      } else if (type === RecordType.PLAYER) {
        if (!payload.first_name) throw new Error('Please enter First Name');
        if (!payload.second_name) throw new Error('Please enter Second Name');
      } else {
        if (!payload.long_name) throw new Error('Please enter Long Name');
        if (!payload.short_name) payload.short_name = payload.long_name;
      }

      if (type === RecordType.COMPETITION) {
        payload.fg_color = payload.fg_color?.trim() || null;
        payload.bg_color = payload.bg_color?.trim() || null;
      }

      if (isEdit) {
        await updateRecord(type, initialData.id, payload);
      } else {
        await createRecord(type, payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save record');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    const action = isEdit ? 'Edit' : 'Add New';
    switch (type) {
      case RecordType.COMPETITION:
        return `${action} Competition`;
      case RecordType.CLUB:
        return `${action} Club`;
      case RecordType.STADIUM:
        return `${action} Stadium`;
      case RecordType.CITY:
        return `${action} City`;
      case RecordType.AWARD:
        return `${action} Award`;
      case RecordType.PLAYER:
        return `${action} Player / Person`;
      case RecordType.STAGE:
        return `${action} Tournament Stage`;
      default:
        return `${action} Record`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-200">
        <div className="bg-[#e2f0fd] border-b border-[#cbe4fa] px-4 sm:px-6 py-2.5 sm:py-3 shrink-0 flex items-center justify-between">
          <h3 className="font-bold text-sm text-[#1e3a8a]">{getTitle()}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-xl leading-none p-1"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4 flex-1">
          {error && (
            <div className="bg-red-50 text-red-600 border border-red-200 rounded p-3 text-xs">
              {error}
            </div>
          )}

          {/* ID */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              FM Unique ID <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              disabled={isEdit}
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              placeholder="e.g. 102422"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              required
            />
          </div>

          {/* Names */}
          {type === 'player' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.first_name || ''}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="e.g. Oliver"
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Last / Second Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.second_name || ''}
                    onChange={(e) => setFormData({ ...formData, second_name: e.target.value })}
                    placeholder="e.g. Kahn"
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Common Name / Nickname
                </label>
                <input
                  type="text"
                  value={formData.common_name || ''}
                  onChange={(e) => setFormData({ ...formData, common_name: e.target.value })}
                  placeholder="e.g. Der Titan (leave empty if none)"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </>
          ) : type === RecordType.STADIUM || type === RecordType.CITY || type === RecordType.STAGE ? (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={type === RecordType.STAGE ? 'e.g. Group Stage' : 'e.g. Old Trafford'}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Long Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.long_name || ''}
                  onChange={(e) => setFormData({ ...formData, long_name: e.target.value })}
                  placeholder="e.g. Manchester United FC"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Short Name
                </label>
                <input
                  type="text"
                  value={formData.short_name || ''}
                  onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                  placeholder="e.g. Man Utd"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* Award Specific: Optional Nation ID / Comp ID */}
          {type === 'award' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nation ID (Optional)
                </label>
                <input
                  type="number"
                  value={formData.nation_id || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      nation_id: e.target.value ? parseInt(e.target.value, 10) : null,
                    })
                  }
                  placeholder="e.g. 765"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Competition ID (Optional)
                </label>
                <input
                  type="number"
                  value={formData.comp_id || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      comp_id: e.target.value ? parseInt(e.target.value, 10) : null,
                    })
                  }
                  placeholder="e.g. 11"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* 3 Letter & 6 Letter for Clubs */}
          {type === 'club' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  3-Letter Code
                </label>
                <input
                  type="text"
                  value={formData.three_letter_name || ''}
                  onChange={(e) => setFormData({ ...formData, three_letter_name: e.target.value })}
                  placeholder="e.g. MUN"
                  maxLength={10}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  6-Letter Code
                </label>
                <input
                  type="text"
                  value={formData.six_letter_name || ''}
                  onChange={(e) => setFormData({ ...formData, six_letter_name: e.target.value })}
                  placeholder="e.g. Man Utd"
                  maxLength={15}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Extinct Status for Clubs */}
          {type === 'club' && (
            <div className="flex items-center gap-2 pt-1 pb-1">
              <input
                type="checkbox"
                id="is_extinct"
                checked={!!formData.is_extinct}
                onChange={(e) => setFormData({ ...formData, is_extinct: e.target.checked })}
                className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 cursor-pointer"
              />
              <label htmlFor="is_extinct" className="text-xs font-semibold text-gray-700 cursor-pointer">
                Extinct / Defunct Club
              </label>
            </div>
          )}

          {/* 3 Letter for Competition */}
          {type === 'competition' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  3-Letter Code
                </label>
                <input
                  type="text"
                  value={formData.three_letter_name || ''}
                  onChange={(e) => setFormData({ ...formData, three_letter_name: e.target.value })}
                  placeholder="e.g. EPL"
                  maxLength={10}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Categories
                </label>
                <input
                  type="text"
                  value={formData.categories || ''}
                  onChange={(e) => setFormData({ ...formData, categories: e.target.value })}
                  placeholder="e.g. League (1)"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Colors for Competition */}
          {type === 'competition' && (
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    FG Color (RGB)
                  </label>
                  <input
                    type="text"
                    value={formData.fg_color || ''}
                    onChange={(e) => setFormData({ ...formData, fg_color: e.target.value })}
                    placeholder="e.g. 255 255 255 (optional)"
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    BG Color (RGB)
                  </label>
                  <input
                    type="text"
                    value={formData.bg_color || ''}
                    onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })}
                    placeholder="e.g. 0 0 0 (optional)"
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>
              <div className="text-[11px] text-gray-400">
                Leave empty if this competition doesn&apos;t use custom colors.
              </div>
            </div>
          )}

          {/* Categories for Cities */}
          {type === 'city' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Region / Category
              </label>
              <input
                type="text"
                value={formData.categories || ''}
                onChange={(e) => setFormData({ ...formData, categories: e.target.value })}
                placeholder="e.g. North West"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Note */}
          {type !== 'city' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Note
              </label>
              <input
                type="text"
                value={formData.note || ''}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="e.g. Fix licensed name"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0284c7] hover:bg-[#0369a1] rounded shadow transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
