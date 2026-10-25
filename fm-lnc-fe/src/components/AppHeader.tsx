'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Dropdown, Tooltip, type MenuProps } from 'antd';
import {
  MenuOutlined,
  SearchOutlined,
  SyncOutlined,
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
  UserOutlined,
  FlagOutlined,
  DownOutlined,
  SettingOutlined,
} from '@ant-design/icons';

import { RecordType } from '../types';
import { CompIcon, ClubIcon, StadiumIcon, CityIcon, AwardIcon } from './EntityIcons';
import { BreadcrumbStep, HeaderLogoInfo } from '../context/AppContext';

export { RecordType };
export type QuickAddType = RecordType;

interface AppHeaderProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
  onToggleMobileMenu: () => void;
  onOpenSearchModal: () => void;
  onOpenSettings?: () => void;
  onSync: () => void;
  isSyncing?: boolean;
  onExport: () => void;
  onQuickAdd: (type: QuickAddType) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  currentStepTitle?: string;
  currentStepId?: string | number;
  breadcrumbs?: BreadcrumbStep[];
  backHref?: string | (() => void) | null;
  headerLogo?: HeaderLogoInfo | null;
}

export default function AppHeader({
  collapsed,
  onToggleSidebar,
  onToggleMobileMenu,
  onOpenSearchModal,
  onOpenSettings,
  onSync,
  isSyncing = false,
  onExport,
  onQuickAdd,
  onRefresh,
  isRefreshing = false,
  currentStepTitle,
  currentStepId,
  breadcrumbs,
  backHref,
  headerLogo,
}: AppHeaderProps) {
  const router = useRouter();

  const effectiveBreadcrumbs: BreadcrumbStep[] = useMemo(() => {
    if (breadcrumbs && breadcrumbs.length > 0) {
      return breadcrumbs;
    }
    if (
      currentStepTitle &&
      currentStepTitle !== 'HOME' &&
      currentStepTitle !== 'Confederations & Nations'
    ) {
      return [{ title: 'HOME', href: '/' }, { title: currentStepTitle }];
    }
    return [];
  }, [breadcrumbs, currentStepTitle]);

  // Quick Add Dropdown Menu items
  const quickAddItems: MenuProps['items'] = [
    {
      key: RecordType.CLUB,
      icon: <ClubIcon size={16} className="text-blue-500" />,
      label: 'Add Club',
      onClick: () => onQuickAdd(RecordType.CLUB),
    },
    {
      key: RecordType.COMPETITION,
      icon: <CompIcon size={16} className="text-amber-500" />,
      label: 'Add Competition',
      onClick: () => onQuickAdd(RecordType.COMPETITION),
    },
    {
      type: 'divider',
    },
    {
      key: RecordType.CITY,
      icon: <CityIcon size={16} className="text-sky-500" />,
      label: 'Add City',
      onClick: () => onQuickAdd(RecordType.CITY),
    },
    {
      key: RecordType.STADIUM,
      icon: <StadiumIcon size={16} className="text-emerald-500" />,
      label: 'Add Stadium',
      onClick: () => onQuickAdd(RecordType.STADIUM),
    },
    {
      key: RecordType.AWARD,
      icon: <AwardIcon size={16} className="text-yellow-500" />,
      label: 'Add Award',
      onClick: () => onQuickAdd(RecordType.AWARD),
    },
    {
      type: 'divider',
    },
    {
      key: RecordType.PLAYER,
      icon: <UserOutlined className="text-sky-500" />,
      label: 'Add Person',
      onClick: () => onQuickAdd(RecordType.PLAYER),
    },
    {
      key: RecordType.STAGE,
      icon: <FlagOutlined className="text-rose-500" />,
      label: 'Add Stage',
      onClick: () => onQuickAdd(RecordType.STAGE),
    },
  ];

  // Combined Header Action Items (Export, Sync, Refresh, Quick Add)
  const actionMenuItems: MenuProps['items'] = [
    {
      key: 'export',
      icon: <DownloadOutlined className="text-blue-600 text-sm" />,
      label: (
        <div className="flex items-center justify-between gap-6 py-1 min-w-[190px]">
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800 text-xs sm:text-sm">Export .LNC</span>
            <span className="text-[11px] text-slate-400">Write names to FM24 files</span>
          </div>
          <kbd className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            Alt+E
          </kbd>
        </div>
      ),
      onClick: onExport,
    },
    {
      key: 'sync',
      icon: (
        <SyncOutlined
          spin={isSyncing}
          className={isSyncing ? 'text-blue-600 text-sm' : 'text-slate-600 text-sm'}
        />
      ),
      label: (
        <div className="flex items-center justify-between gap-6 py-1 min-w-[190px]">
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800 text-xs sm:text-sm">Sync .LNC</span>
            <span className="text-[11px] text-slate-400">Sync database with source</span>
          </div>
          <kbd className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            Alt+S
          </kbd>
        </div>
      ),
      disabled: isSyncing,
      onClick: onSync,
    },
    {
      type: 'divider',
    },
    {
      key: 'refresh',
      icon: (
        <ReloadOutlined
          className={isRefreshing ? 'animate-spin text-blue-600 text-sm' : 'text-slate-600 text-sm'}
        />
      ),
      label: (
        <div className="flex items-center justify-between gap-6 py-1 min-w-[190px]">
          <div className="flex flex-col">
            <span className="font-medium text-slate-700 text-xs sm:text-sm">Refresh View</span>
            <span className="text-[11px] text-slate-400">Reload current page data</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">F5</span>
        </div>
      ),
      disabled: isRefreshing,
      onClick: onRefresh,
    },
    {
      type: 'divider',
    },
    {
      key: 'quick-add',
      icon: <PlusOutlined className="text-emerald-600 text-sm" />,
      label: (
        <div className="py-0.5">
          <span className="font-medium text-slate-700 text-xs sm:text-sm">Quick Add Record...</span>
        </div>
      ),
      children: quickAddItems,
    },
    {
      type: 'divider',
    },
    {
      key: 'settings',
      icon: <SettingOutlined className="text-slate-600 text-sm" />,
      label: (
        <div className="flex items-center justify-between gap-6 py-1 min-w-[190px]">
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800 text-xs sm:text-sm">
              Cấu hình thư mục
            </span>
            <span className="text-[11px] text-slate-400">File .LNC & thư mục logo</span>
          </div>
          <kbd className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            Ctrl+,
          </kbd>
        </div>
      ),
      onClick: onOpenSettings,
    },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs transition-all">
      {/* Main Header Row */}
      <div className="h-14 sm:h-16 px-2.5 sm:px-6 flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Left Section: Sidebar Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Desktop Sidebar Toggle */}
          <Tooltip title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}>
            <button
              type="button"
              onClick={onToggleSidebar}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Toggle Sidebar"
            >
              <MenuOutlined className="text-lg" />
            </button>
          </Tooltip>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="flex lg:hidden items-center justify-center w-8 h-8 rounded text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            aria-label="Open Navigation Menu"
          >
            <MenuOutlined className="text-base sm:text-lg" />
          </button>
        </div>

        {/* Center Section: Quick Search Bar */}
        <div className="flex-1 max-w-[140px] xs:max-w-[200px] sm:max-w-md mx-auto">
          <button
            type="button"
            onClick={onOpenSearchModal}
            className="w-full h-8 sm:h-9 px-2 sm:px-3 rounded-lg bg-slate-50 hover:bg-slate-100/90 border border-slate-200 hover:border-blue-400/60 flex items-center justify-between text-xs sm:text-sm text-slate-500 hover:text-slate-700 transition-all cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center gap-1.5 sm:gap-2 truncate">
              <SearchOutlined className="text-slate-400 group-hover:text-blue-600 transition-colors text-xs sm:text-sm shrink-0" />
              <span className="truncate hidden sm:inline">Search club, comp, nation, ID...</span>
              <span className="truncate sm:hidden">Search...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-white rounded border border-slate-200 shadow-2xs group-hover:border-slate-300">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Right Section: Actions Dropdown + Settings Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onOpenSettings && (
            <Tooltip title="Cấu hình Thư mục Dữ liệu & Ảnh (Ctrl+,)">
              <Button
                icon={<SettingOutlined className="text-slate-600 text-sm" />}
                onClick={onOpenSettings}
                className="h-8 sm:h-9 px-2.5 sm:px-3 border-slate-200 hover:border-blue-400 hover:text-blue-600 shadow-2xs cursor-pointer flex items-center justify-center"
              />
            </Tooltip>
          )}

          <Dropdown menu={{ items: actionMenuItems }} placement="bottomRight" trigger={['click']}>
            <Button
              type="primary"
              icon={<DownloadOutlined className="text-sm" />}
              loading={isSyncing || isRefreshing}
              className="bg-blue-600 hover:bg-blue-700 font-medium shadow-xs px-2.5 sm:px-3 h-8 sm:h-9 flex items-center gap-1 sm:gap-1.5 cursor-pointer"
              title="Export & Sync Menu"
            >
              <span className="text-xs sm:text-sm font-semibold hidden sm:inline">
                Export / Sync
              </span>
              <DownOutlined className="text-[9px] text-blue-200 ml-0.5" />
            </Button>
          </Dropdown>
        </div>
      </div>

      {/* Dedicated Breadcrumbs Bar (below main header) */}
      {effectiveBreadcrumbs.length > 1 && (
        <div className="bg-white border-t border-slate-100 px-3 sm:px-6 py-1.5 sm:py-2 transition-all">
          <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-[13px] font-bold uppercase tracking-tight flex-wrap">
            {effectiveBreadcrumbs.map((crumb, idx) => {
              const isLast = idx === effectiveBreadcrumbs.length - 1;
              return (
                <React.Fragment key={idx}>
                  {idx > 0 && (
                    <span className="text-[#1d70b8] font-bold select-none px-0.5">&gt;</span>
                  )}
                  {isLast ? (
                    <span className="font-bold text-[#0f3b6c] whitespace-nowrap">
                      {crumb.title}
                    </span>
                  ) : crumb.href ? (
                    <a
                      onClick={() => router.push(crumb.href!)}
                      className="text-[#1d70b8] hover:underline font-bold cursor-pointer whitespace-nowrap"
                    >
                      {crumb.title}
                    </a>
                  ) : crumb.onClick ? (
                    <a
                      onClick={crumb.onClick}
                      className="text-[#1d70b8] hover:underline font-bold cursor-pointer whitespace-nowrap"
                    >
                      {crumb.title}
                    </a>
                  ) : (
                    <span className="text-[#1d70b8] font-bold whitespace-nowrap">
                      {crumb.title}
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
