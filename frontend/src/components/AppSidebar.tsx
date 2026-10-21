'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Tooltip, Badge } from 'antd';
import {
  GlobalOutlined,
  UserOutlined,
  FlagOutlined,
  StarOutlined,
  SearchOutlined,
  SyncOutlined,
  DownloadOutlined,
  DatabaseOutlined,
  CloseOutlined,
  LeftOutlined,
  RightOutlined,
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

  const navItems = [
    {
      group: 'EXPLORER',
      items: [
        {
          key: HierarchyLevel.CONTINENTS,
          title: 'Confederations & Nations',
          label: 'Confederations & Nations',
          icon: <GlobalOutlined className="text-base" />,
          active: isHierarchyActive,
          badge: totalContinents > 0 ? totalContinents : undefined,
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
      ],
    },
    {
      group: 'GLOBAL ENTITIES',
      items: [
        {
          key: HierarchyLevel.GLOBAL_PLAYERS,
          title: 'Players / Staff',
          label: 'Players & Staff',
          icon: <UserOutlined className="text-base" />,
          active: isPlayersActive,
          onClick: () => {
            router.push('/players');
            if (isMobileOpen) onCloseMobile();
          },
        },
        {
          key: HierarchyLevel.GLOBAL_STAGES,
          title: 'Tournament Stages',
          label: 'Tournament Stages',
          icon: <FlagOutlined className="text-base" />,
          active: isStagesActive,
          onClick: () => {
            router.push('/stages');
            if (isMobileOpen) onCloseMobile();
          },
        },
      ],
    },
    {
      group: 'DATABASE TOOLS',
      items: [
        {
          key: 'SEARCH',
          label: 'Quick Search',
          icon: <SearchOutlined className="text-base" />,
          extra: (
            <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-slate-800 text-slate-400 rounded border border-slate-700">
              ⌘K
            </kbd>
          ),
          onClick: () => {
            onOpenSearchModal();
            if (isMobileOpen) onCloseMobile();
          },
        },
        {
          key: 'SYNC',
          label: 'Sync .LNC Files',
          icon: <SyncOutlined className="text-base" />,
          onClick: () => {
            onSync();
            if (isMobileOpen) onCloseMobile();
          },
        },
        {
          key: 'EXPORT',
          label: 'Export .LNC',
          icon: <DownloadOutlined className="text-base" />,
          onClick: () => {
            onExport();
            if (isMobileOpen) onCloseMobile();
          },
        },
      ],
    },
  ];

  // Render sidebar inner content
  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0a1120] text-slate-300 border-r border-[#19263e] select-none">
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#19263e] shrink-0">
        <div
          onClick={() => {
            router.push('/');
            if (isMobileOpen) onCloseMobile();
          }}
          className="flex items-center gap-3 cursor-pointer group overflow-hidden"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0 group-hover:scale-105 transition-transform">
            <DatabaseOutlined className="text-lg" />
          </div>
          {!collapsed && (
            <div className="min-w-0 transition-opacity duration-200">
              <div className="font-bold text-sm text-white tracking-wide flex items-center gap-1.5">
                <span>FM .LNC</span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded">
                  24.3
                </span>
              </div>
              <div className="text-[11px] text-slate-400 truncate">Database Manager</div>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        {isMobileOpen && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
          >
            <CloseOutlined />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2.5 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
        {navItems.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!collapsed ? (
              <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {section.group}
              </div>
            ) : (
              <div className="w-6 mx-auto border-t border-[#19263e] my-2" />
            )}

            {section.items.map((item) => {
              const active = 'active' in item && item.active;
              const buttonNode = (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.onClick}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all group relative cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  } ${collapsed ? 'justify-center px-0' : 'justify-between'}`}
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
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!collapsed && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {'badge' in item && item.badge !== undefined && (
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
                      )}
                      {'extra' in item && item.extra}
                    </div>
                  )}
                </button>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.key} placement="right" title={item.label}>
                    <div>{buttonNode}</div>
                  </Tooltip>
                );
              }

              return buttonNode;
            })}
          </div>
        ))}
      </div>

      {/* Footer Info & Collapse Toggle */}
      <div className="p-3 border-t border-[#19263e] shrink-0 bg-[#070d18]">
        {!collapsed ? (
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate">Football Manager 2024</span>
            </div>
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex items-center justify-center p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Collapse sidebar"
            >
              <LeftOutlined className="text-xs" />
            </button>
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

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 h-screen sticky top-0 transition-all duration-300 ease-in-out z-40 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
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
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
