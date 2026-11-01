'use client';

import React from 'react';
import { Badge, Tooltip } from 'antd';

export interface ChildEntityItem {
  key: string;
  label: string;
  count?: number | string;
  icon: React.ReactNode;
  badgeStyles?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export interface ChildEntitiesSectionProps {
  items: ChildEntityItem[];
  className?: string;
}

export default function ChildEntitiesSection({
  items,
  className = '',
}: ChildEntitiesSectionProps) {
  if (!items || items.length === 0) return null;

  return (
    <div
      className={`bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm ${className}`}
    >
      {/* Mỗi mục chỉ gồm ô icon + badge số lượng (giống footer cũ của EntityCard); nhãn hiện khi hover */}
      <div className="flex flex-wrap items-center gap-3">
        {items.map((item) => {
          const count = item.count ?? 0;
          return (
            <Tooltip key={item.key} title={`${item.label}: ${count}`} destroyOnHidden>
              <Badge
                count={count}
                showZero
                overflowCount={99999}
                offset={[3, -3]}
                style={{
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  fontSize: '10px',
                  height: '17px',
                  minWidth: '17px',
                  lineHeight: '17px',
                  padding: '0 4px',
                  boxShadow: '0 0 0 1.5px #ffffff',
                }}
              >
                <button
                  type="button"
                  disabled={item.disabled}
                  onClick={item.disabled ? undefined : item.onClick}
                  aria-label={`${item.label}: ${count}`}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all ${
                    item.badgeStyles || 'bg-white border-slate-200 text-slate-600'
                  } ${
                    item.disabled
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer hover:shadow-sm hover:scale-105'
                  }`}
                >
                  {item.icon}
                </button>
              </Badge>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
