'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Tooltip, Badge } from 'antd';
import {
  GlobalOutlined,
  UserOutlined,
  FlagOutlined,
  CloseOutlined,
  LeftOutlined,
  RightOutlined,
  SettingOutlined,
} from '@ant-design/icons';

import { HierarchyLevel } from '../types';

export { HierarchyLevel };

interface AppSidebarProps {
  currentLevel?: HierarchyLevel | string;
  onNavigateLevel?: (level: HierarchyLevel, title: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenSearchModal: () => void;
  onOpenSettings?: () => void;
  onSync: () => void;
  onExport: () => void;
  totalContinents?: number;
}

export default function AppSidebar({
  currentLevel,
  onNavigateLevel,
  collapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onOpenSearchModal,
  onOpenSettings,
  onSync,
  onExport,
  totalContinents = 0,
}: AppSidebarProps) {
  const pathname = usePathname() || '/';
  const router = useRouter();

  // Active check by route
  const isHierarchyActive =
    pathname === '/' ||
    pathname.startsWith('/tree') ||
    pathname.startsWith('/confederation') ||
    pathname.startsWith('/nation') ||
    pathname.startsWith('/comp');
  const isPlayersActive = pathname === '/players';
  const isStagesActive = pathname === '/stages';

  interface NavItem {
    key: string;
    title: string;
    label: string;
    icon: React.ReactNode;
    active: boolean;
    badge?: number;
    badgeColor?: string;
    onClick: () => void;
  }

  const navItems: NavItem[] = [
    {
      key: 'WORLD',
      title: 'World',
      label: 'World',
      icon: <GlobalOutlined className="text-base" />,
      active: isHierarchyActive,
      badge: undefined,
      badgeColor: '#1d70b8',
      onClick: () => {
        if (pathname !== '/') {
          router.push('/');
        } else if (onNavigateLevel) {
          onNavigateLevel(HierarchyLevel.CONTINENTS, 'Confederations');
        }
        if (isMobileOpen) onCloseMobile();
      },
    },
    {
      key: 'PERSON',
      title: 'Person',
      label: 'Person',
      icon: <UserOutlined className="text-base" />,
      active: isPlayersActive,
      onClick: () => {
        router.push('/players');
        if (isMobileOpen) onCloseMobile();
      },
    },
    {
      key: 'STAGE',
      title: 'Stage',
      label: 'Stage',
      icon: <FlagOutlined className="text-base" />,
      active: isStagesActive,
      onClick: () => {
        router.push('/stages');
        if (isMobileOpen) onCloseMobile();
      },
    },
  ];

  // Helper to render sidebar content for desktop or mobile drawer
  const renderSidebarContent = (isMobile: boolean = false) => {
    const isCollapsed = isMobile ? false : collapsed;

    return (
      <div className="flex flex-col h-full bg-[#0a1120] text-slate-300 border-r border-[#19263e] select-none">
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#19263e] shrink-0">
          <div
            onClick={() => {
              router.push('/');
              if (isMobile) onCloseMobile();
            }}
            className="flex items-center gap-3 cursor-pointer group overflow-hidden"
          >
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md shadow-black/20 shrink-0 group-hover:scale-105 transition-transform flex items-center justify-center">
              <img
                src="/fm/icons/icon-192.png"
                alt="FM24 LNC"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 transition-opacity duration-200">
                <div className="font-bold text-sm text-white tracking-wide flex items-center gap-1.5">
                  <span>FM24 LNC</span>
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded">
                    24.3
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">Database Manager</div>
              </div>
            )}
          </div>

          {/* Mobile close button */}
          {isMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 cursor-pointer text-base transition-colors"
              aria-label="Close menu"
            >
              <CloseOutlined />
            </button>
          )}
        </div>

        {/* Navigation Items (World, Person, Stage) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2.5 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
          {navItems.map((item) => {
            const active = item.active;
            const buttonNode = (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all group relative cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                } ${isCollapsed ? 'justify-center px-0' : 'justify-between'}`}
              >
                <div className="flex items-center gap-3 truncate">
                  <span
                    className={`shrink-0 transition-colors ${
                      active
                        ? 'text-white'
                        : 'text-slate-400 group-hover:text-blue-400'
                    }`}
                  >
                    {item.icon}
                  </span>
                  {!isCollapsed && <span className="truncate font-semibold">{item.label}</span>}
                </div>

                {!isCollapsed && item.badge !== undefined && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      count={item.badge}
                      overflowCount={999}
                      style={{
                        backgroundColor: active ? '#1e40af' : (item.badgeColor || '#334155'),
                        color: '#ffffff',
                        fontSize: '10px',
                        height: '18px',
                        lineHeight: '18px',
                        minWidth: '18px',
                        padding: '0 5px',
                        borderColor: 'transparent',
                      }}
                    />
                  </div>
                )}
              </button>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.key} placement="right" title={item.label}>
                  <div>{buttonNode}</div>
                </Tooltip>
              );
            }

            return <div key={item.key}>{buttonNode}</div>;
          })}
        </div>

        {/* Settings Button */}
        {onOpenSettings && (
          <div className="px-3 pb-2 pt-1 border-t border-[#19263e]/60">
            {isCollapsed ? (
              <Tooltip placement="right" title="Cấu hình thư mục (Ctrl+,)">
                <button
                  type="button"
                  onClick={() => {
                    onOpenSettings();
                    if (isMobile) onCloseMobile();
                  }}
                  className="w-full flex items-center justify-center p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer"
                  title="Cấu hình thư mục (Ctrl+,)"
                >
                  <SettingOutlined className="text-base" />
                </button>
              </Tooltip>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onOpenSettings();
                  if (isMobile) onCloseMobile();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer"
                title="Cấu hình thư mục (Ctrl+,)"
              >
                <SettingOutlined className="text-base shrink-0" />
                <span className="truncate font-semibold text-xs">Cấu hình thư mục</span>
              </button>
            )}
          </div>
        )}

        {/* Footer Info & Collapse Toggle (Collapse toggle only on desktop) */}
        <div className="p-3 border-t border-[#19263e] shrink-0 bg-[#070d18]">
          {!isCollapsed ? (
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="truncate">Football Manager 2024</span>
              </div>
              {!isMobile && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="hidden lg:flex items-center justify-center p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Collapse sidebar"
                >
                  <LeftOutlined className="text-xs" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:flex items-center justify-center p-2 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Expand sidebar"
              >
                <RightOutlined className="text-xs" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 h-screen sticky top-0 transition-all duration-300 ease-in-out z-40 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Slide Drawer */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
