'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Dropdown,
  Tooltip,
  Tag,
  Breadcrumb,
  type MenuProps,
} from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
  SearchOutlined,
  SyncOutlined,
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
  TrophyOutlined,
  BankOutlined,
  EnvironmentOutlined,
  StarOutlined,
  UserOutlined,
  FlagOutlined,
  CompassOutlined,
  DatabaseOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';

import { RecordType } from '../types';
import { BreadcrumbStep, HeaderLogoInfo } from '../context/AppContext';

export { RecordType };
export type QuickAddType = RecordType;

interface AppHeaderProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
  onToggleMobileMenu: () => void;
  onOpenSearchModal: () => void;
  onSync: () => void;
  isSyncing?: boolean;
  onExport: () => void;
  onQuickAdd: (type: QuickAddType) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  currentStepTitle?: string;
  currentStepId?: number;
  breadcrumbs?: BreadcrumbStep[];
  backHref?: string | (() => void) | null;
  headerLogo?: HeaderLogoInfo | null;
}

export default function AppHeader({
  collapsed,
  onToggleSidebar,
  onToggleMobileMenu,
  onOpenSearchModal,
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
  // Quick Add Dropdown Menu items
  const quickAddItems: MenuProps['items'] = [
    {
      key: RecordType.CLUB,
      icon: <BankOutlined className="text-blue-500" />,
      label: 'Add Club',
      onClick: () => onQuickAdd(RecordType.CLUB),
    },
    {
      key: RecordType.COMPETITION,
      icon: <TrophyOutlined className="text-emerald-500" />,
      label: 'Add Competition',
      onClick: () => onQuickAdd(RecordType.COMPETITION),
    },
    {
      type: 'divider',
    },
    {
      key: RecordType.CITY,
      icon: <CompassOutlined className="text-purple-500" />,
      label: 'Add City',
      onClick: () => onQuickAdd(RecordType.CITY),
    },
    {
      key: RecordType.STADIUM,
      icon: <EnvironmentOutlined className="text-amber-500" />,
      label: 'Add Stadium',
      onClick: () => onQuickAdd(RecordType.STADIUM),
    },
    {
      key: RecordType.AWARD,
      icon: <StarOutlined className="text-yellow-500" />,
      label: 'Add Award',
      onClick: () => onQuickAdd(RecordType.AWARD),
    },
    {
      type: 'divider',
    },
    {
      key: RecordType.PLAYER,
      icon: <UserOutlined className="text-sky-500" />,
      label: 'Add Player / Staff',
      onClick: () => onQuickAdd(RecordType.PLAYER),
    },
    {
      key: RecordType.STAGE,
      icon: <FlagOutlined className="text-rose-500" />,
      label: 'Add Stage',
      onClick: () => onQuickAdd(RecordType.STAGE),
    },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs px-3 sm:px-6 flex items-center justify-between gap-3 transition-all">
      {/* Left Section: Sidebar Toggle & Breadcrumb Context */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
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
          className="flex lg:hidden items-center justify-center w-8 h-8 rounded text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Open Navigation Menu"
        >
          <MenuOutlined className="text-lg" />
        </button>

        {/* Compact Clean Breadcrumbs: HOME > {CONFEDERATION} > {NATION} > {COMP} */}
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <div className="flex items-center gap-1 text-xs sm:text-[13px] font-bold uppercase tracking-tight min-w-0">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
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
        ) : (
          <div className="flex items-center gap-1 text-xs sm:text-[13px] font-bold uppercase tracking-tight text-[#1d70b8] shrink-0">
            <span>HOME</span>
            {currentStepTitle && currentStepTitle !== 'HOME' && (
              <>
                <span className="text-[#1d70b8] font-bold select-none px-0.5">&gt;</span>
                <span className="text-[#0f3b6c] font-bold truncate max-w-[200px] xl:max-w-[320px]">
                  {currentStepTitle}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Center Section: Quick Search Bar */}
      <div className="flex-1 max-w-xs sm:max-w-md mx-auto">
        <button
          type="button"
          onClick={onOpenSearchModal}
          className="w-full h-9 px-3 rounded-lg bg-slate-50 hover:bg-slate-100/90 border border-slate-200 hover:border-blue-400/60 flex items-center justify-between text-xs sm:text-sm text-slate-500 hover:text-slate-700 transition-all cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center gap-2 truncate">
            <SearchOutlined className="text-slate-400 group-hover:text-blue-600 transition-colors text-sm" />
            <span className="truncate">Search club, comp, nation, ID...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-white rounded border border-slate-200 shadow-2xs group-hover:border-slate-300">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      </div>

      {/* Right Section: Actions (Quick Add, Sync, Export, Refresh) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Refresh Current View */}
        <Tooltip title="Refresh Current View">
          <Button
            type="text"
            shape="circle"
            size="middle"
            icon={<ReloadOutlined className={isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-600'} />}
            onClick={onRefresh}
            className="hover:bg-slate-100"
          />
        </Tooltip>

        {/* Sync Button */}
        <Tooltip title="Sync .LNC (Alt+S)">
          <Button
            icon={<SyncOutlined spin={isSyncing} className={isSyncing ? 'text-blue-600' : ''} />}
            size="middle"
            onClick={onSync}
            loading={isSyncing}
            className="border-slate-300 hover:border-blue-500 font-medium"
          >
            Sync
          </Button>
        </Tooltip>

        {/* Export Button */}
        <Tooltip title="Export .LNC (Alt+E)">
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            size="middle"
            onClick={onExport}
            className="bg-blue-600 hover:bg-blue-700 font-medium shadow-xs"
          >
            Export
          </Button>
        </Tooltip>
      </div>
    </header>
  );
}
