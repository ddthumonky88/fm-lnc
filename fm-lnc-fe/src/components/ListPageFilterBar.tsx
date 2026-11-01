'use client';

import React from 'react';
import { DownOutlined } from '@ant-design/icons';

export interface ListPageFilterBarProps {
  /** Icon đại diện page (vuông bên trái) */
  pageIcon: React.ReactNode;
  /** Class styling cho hộp icon (ví dụ: bg-blue-50 text-blue-600 border-blue-200) */
  iconBoxClassName?: string;
  /** Tiêu đề / tóm tắt bộ lọc hiện tại */
  filterSummary: React.ReactNode;
  /** Label nhỏ hiển thị tiền tố (mặc định: 'Bộ lọc:') */
  filterPrefix?: string;
  /** Số lượng kết quả hoặc số lượng filter đang active */
  badgeCount?: number | string;
  /** Đang có filter tuỳ chỉnh khác mặc định */
  hasActiveCustomFilter?: boolean;
  /** Handler khi nhấn vào thanh filter */
  onClick: () => void;
  /** Tooltip hoặc placeholder khi chưa có filter */
  placeholder?: string;
}

export default function ListPageFilterBar({
  pageIcon,
  iconBoxClassName = 'bg-slate-100 text-slate-700 border-slate-200/80',
  filterSummary,
  filterPrefix,
  badgeCount,
  hasActiveCustomFilter = false,
  onClick,
}: ListPageFilterBarProps) {
  return (
    <div className="flex items-center gap-2.5 w-full">
      {/* 1. Icon đại diện page (vuông bên trái) */}
      <div
        className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs transition-all ${iconBoxClassName}`}
      >
        {pageIcon}
      </div>

      {/* 2. Thanh select filter (nhấn vào hiện modal select / tree select) */}
      <button
        type="button"
        onClick={onClick}
        aria-label="Mở bộ lọc"
        className="flex-1 min-w-0 h-10 px-3.5 bg-slate-50/90 hover:bg-slate-100/90 active:bg-slate-200/70 border border-slate-200 hover:border-blue-400 focus:border-blue-500 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer shadow-2xs group"
      >
        <div className="flex items-center gap-2 truncate min-w-0 flex-1">
          {filterPrefix ? (
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">
              {filterPrefix}
            </span>
          ) : null}
          <span className="text-sm font-semibold text-slate-800 truncate">
            {filterSummary}
          </span>
          {badgeCount !== undefined ? (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200/60 shrink-0">
              {badgeCount}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-blue-600 transition-colors ml-2 shrink-0">
          {hasActiveCustomFilter && (
            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 animate-pulse" />
          )}
          <DownOutlined className="text-xs" />
        </div>
      </button>
    </div>
  );
}

