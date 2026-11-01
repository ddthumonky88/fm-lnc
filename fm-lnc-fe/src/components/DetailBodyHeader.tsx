'use client';

import React, { useState } from 'react';
import { Button, Tag, Tooltip, Dropdown, App, type MenuProps } from 'antd';
import {
  ArrowLeftOutlined,
  CopyOutlined,
  CheckOutlined,
  EllipsisOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';

export interface DetailBodyHeaderProps {
  onBack: () => void;
  id: string | number;
  name: string;
  code3?: string;
  icon?: React.ReactNode;
  logoUrl?: string | null;
  badgeTypeStyles?: string;
  /** Hiện trong menu 3 chấm cạnh thẻ ID */
  onEdit?: () => void;
  onDelete?: () => void;
  extraTag?: React.ReactNode;
  className?: string;
}

export default function DetailBodyHeader({
  onBack,
  id,
  name,
  code3,
  icon,
  logoUrl,
  badgeTypeStyles,
  onEdit,
  onDelete,
  extraTag,
  className = '',
}: DetailBodyHeaderProps) {
  const { message } = App.useApp();
  const [copied, setCopied] = useState(false);

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (id !== undefined && id !== null) {
      navigator.clipboard.writeText(String(id));
      setCopied(true);
      message.success(`Copied ID: ${id}`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const menuItems: MenuProps['items'] = [
    ...(onEdit
      ? [
          {
            key: 'edit',
            icon: <EditOutlined className="text-blue-600" />,
            label: 'Edit',
            onClick: () => onEdit(),
          },
        ]
      : []),
    ...(onDelete
      ? [
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: 'Delete',
            danger: true,
            onClick: () => onDelete(),
          },
        ]
      : []),
  ];

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 min-w-0 px-0.5 py-1 ${className}`}>
      {/* Back button */}
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={onBack}
        shape="circle"
        size="middle"
        className="shrink-0 text-slate-600 hover:text-slate-900 border-slate-200"
      />

      {/* Entity icon / logo */}
      {logoUrl ? (
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shrink-0 flex items-center justify-center p-0.5">
          <img
            src={logoUrl}
            alt={name}
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      ) : (
        <div
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 border ${
            badgeTypeStyles || 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          {icon}
        </div>
      )}

      {/* 2 lines: Line 1 = ID tag (+ code 3L + ⋯ menu), Line 2 = name */}
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <Tooltip title="Click to copy ID" placement="top">
            <button
              type="button"
              onClick={handleCopyId}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100/70 text-blue-700 border border-blue-400 font-mono text-xs font-bold leading-tight cursor-pointer transition-all select-none"
            >
              <span>{id}</span>
              {copied ? (
                <CheckOutlined className="text-emerald-500 text-[10px]" />
              ) : (
                <CopyOutlined className="text-blue-500 text-[10px]" />
              )}
            </button>
          </Tooltip>

          {code3 && (
            <Tag color="blue" className="font-mono font-bold text-xs px-2 py-0 m-0 leading-5">
              {code3}
            </Tag>
          )}

          {extraTag}

          {menuItems.length > 0 && (
            <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomLeft">
              <Button
                type="text"
                shape="circle"
                size="small"
                aria-label="More actions"
                icon={
                  <EllipsisOutlined
                    style={{ fontSize: 16 }}
                    className="text-slate-500 hover:text-blue-600 transition-colors"
                  />
                }
                className="w-6 h-6 flex items-center justify-center hover:bg-blue-100/70 rounded-full cursor-pointer"
              />
            </Dropdown>
          )}
        </div>

        <div className="mt-1.5 min-w-0">
          <h1
            className="text-base sm:text-lg font-bold text-slate-900 break-words m-0 leading-tight"
            title={name}
          >
            {name}
          </h1>
        </div>
      </div>
    </div>
  );
}
