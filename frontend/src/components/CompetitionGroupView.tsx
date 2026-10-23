'use client';

import React, { useState, useMemo } from 'react';
import { Badge, Empty, Select, Switch, Tooltip } from 'antd';
import {
  TrophyOutlined,
  SafetyOutlined,
  StarOutlined,
  GlobalOutlined,
  AppstoreOutlined,
  FilterOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import CardGrid from './CardGrid';
import SubCompetitionsDrawer from './SubCompetitionsDrawer';

export type CompetitionGroupKey = 'all' | 'league' | 'cup' | 'youth' | 'other';

export function getCompetitionGroup(category?: string | null): 'league' | 'cup' | 'youth' | 'other' {
  if (!category) return 'other';
  const cat = category.trim().toLowerCase();
  if (cat.includes('youth')) return 'youth';
  if (cat.startsWith('league') || cat.includes('league') || cat.includes('lower leagues')) return 'league';
  if (cat.includes('cup')) return 'cup';
  return 'other';
}

export function sortCompetitionsByCategory(a: any, b: any): number {
  const aVirtual = !!a.is_virtual || a.id === '[OTHER]' || a.id === '[EXTINCT]';
  const bVirtual = !!b.is_virtual || b.id === '[OTHER]' || b.id === '[EXTINCT]';
  if (aVirtual && !bVirtual) return -1;
  if (!aVirtual && bVirtual) return 1;
  if (aVirtual && bVirtual) {
    return String(a.long_name || a.name || '').localeCompare(String(b.long_name || b.name || ''));
  }

  const catA = (a.categories || '').trim();
  const catB = (b.categories || '').trim();

  if (!catA && catB) return 1;
  if (catA && !catB) return -1;

  const catComp = catA.localeCompare(catB, undefined, { numeric: true, sensitivity: 'base' });
  if (catComp !== 0) return catComp;

  const nameA = a.long_name || a.short_name || a.name || '';
  const nameB = b.long_name || b.short_name || b.name || '';
  return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
}

interface CompetitionGroupViewProps {
  items: any[];
  loading?: boolean;
  onNavigate?: (step: any) => void;
  onEdit?: (record: any) => void;
  onDelete?: (record: any) => void;
  emptyText?: string;
  extraRight?: React.ReactNode;
  defaultOnlyParents?: boolean;
}

export default function CompetitionGroupView({
  items,
  loading,
  onNavigate,
  onEdit,
  onDelete,
  emptyText = 'No competitions found',
  extraRight,
  defaultOnlyParents = true,
}: CompetitionGroupViewProps) {
  const [selectedGroup, setSelectedGroup] = useState<CompetitionGroupKey>('all');
  const [onlyParents, setOnlyParents] = useState<boolean>(defaultOnlyParents);
  const [drawerParent, setDrawerParent] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filter only parents if onlyParents toggle is active
  const visibleItems = useMemo(() => {
    if (!onlyParents) return items;
    return items.filter((item) => !item.parent_id);
  }, [items, onlyParents]);

  const handleViewChildren = (comp: any) => {
    setDrawerParent(comp);
    setIsDrawerOpen(true);
  };

  const { leagueItems, cupItems, youthItems, otherItems } = useMemo(() => {
    const league: any[] = [];
    const cup: any[] = [];
    const youth: any[] = [];
    const other: any[] = [];

    visibleItems.forEach((item) => {
      const g = getCompetitionGroup(item.categories);
      if (g === 'league') league.push(item);
      else if (g === 'cup') cup.push(item);
      else if (g === 'youth') youth.push(item);
      else other.push(item);
    });

    league.sort(sortCompetitionsByCategory);
    cup.sort(sortCompetitionsByCategory);
    youth.sort(sortCompetitionsByCategory);
    other.sort(sortCompetitionsByCategory);

    return {
      leagueItems: league,
      cupItems: cup,
      youthItems: youth,
      otherItems: other,
    };
  }, [visibleItems]);

  const groupConfigs = useMemo(
    () => [
      {
        key: 'league' as const,
        label: 'League',
        icon: <TrophyOutlined className="text-amber-500 text-sm" />,
        color: '#1677ff',
        items: leagueItems,
      },
      {
        key: 'cup' as const,
        label: 'Cup',
        icon: <SafetyOutlined className="text-emerald-500 text-sm" />,
        color: '#52c41a',
        items: cupItems,
      },
      {
        key: 'youth' as const,
        label: 'Youth',
        icon: <StarOutlined className="text-purple-500 text-sm" />,
        color: '#722ed1',
        items: youthItems,
      },
      {
        key: 'other' as const,
        label: 'Other',
        icon: <GlobalOutlined className="text-gray-500 text-sm" />,
        color: '#64748b',
        items: otherItems,
      },
    ],
    [leagueItems, cupItems, youthItems, otherItems]
  );

  const selectOptions = useMemo(() => {
    return [
      {
        value: 'all',
        label: (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <AppstoreOutlined className="text-blue-500" />
              <span>All Categories</span>
            </span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-600 font-bold">
              {visibleItems.length}
            </span>
          </div>
        ),
      },
      ...groupConfigs
        .filter((g) => g.items.length > 0)
        .map((g) => ({
          value: g.key,
          label: (
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5">
                {g.icon}
                <span>{g.label}</span>
              </span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-gray-100 text-gray-600 font-bold">
                {g.items.length}
              </span>
            </div>
          ),
        })),
    ];
  }, [visibleItems.length, groupConfigs]);

  if (loading) {
    return (
      <div className="text-center py-16 text-sm text-gray-500 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span>Loading competitions...</span>
      </div>
    );
  }

  const hiddenChildrenCount = items.length - visibleItems.length;

  const renderToolbar = () => (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/80 backdrop-blur-sm p-2.5 rounded-xl border border-gray-200/80 shadow-xs">
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="text-xs font-semibold text-gray-600 shrink-0">Category:</span>
        <Select
          value={selectedGroup}
          onChange={(val) => setSelectedGroup(val as CompetitionGroupKey)}
          options={selectOptions}
          className="w-52 text-xs"
          suffixIcon={<FilterOutlined className="text-gray-400" />}
        />

        {/* Parent Only Switch Toggle */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-xs shadow-2xs">
          <Switch
            size="small"
            checked={onlyParents}
            onChange={setOnlyParents}
            className={onlyParents ? 'bg-blue-600' : 'bg-gray-300'}
          />
          <span
            className="font-semibold text-gray-700 cursor-pointer select-none"
            onClick={() => setOnlyParents(!onlyParents)}
            title="Toggle between showing parent competitions only vs all sub-competitions"
          >
            Only Parents
          </span>
          {onlyParents && hiddenChildrenCount > 0 && (
            <Tooltip title={`${hiddenChildrenCount} child competitions are organized inside parent drawers`}>
              <span className="text-[10px] text-amber-700 font-bold bg-amber-100/80 px-1.5 py-0.2 rounded border border-amber-200/80 cursor-help">
                {hiddenChildrenCount} in drawer
              </span>
            </Tooltip>
          )}
        </div>

        <span className="text-xs text-gray-300 font-medium hidden md:inline">|</span>
        <div className="text-xs text-gray-500 font-medium">
          Total: <strong className="text-gray-800">{visibleItems.length}</strong> {visibleItems.length === 1 ? 'competition' : 'competitions'}
        </div>
      </div>

      {extraRight && (
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {extraRight}
        </div>
      )}
    </div>
  );

  if (visibleItems.length === 0) {
    return (
      <div className="space-y-4">
        {renderToolbar()}
        <div className="py-12 bg-white rounded-lg border border-gray-100 shadow-sm">
          <Empty description={emptyText} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Integrated 1-Line Toolbar */}
      {renderToolbar()}

      {/* Render Sections */}
      {selectedGroup === 'all' ? (
        <div className="space-y-8">
          {groupConfigs.map((g) => {
            if (g.items.length === 0) return null;
            return (
              <div key={g.key} className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    {g.icon}
                    <h3 className="font-bold text-sm text-gray-800 tracking-wide uppercase">
                      {g.label}
                    </h3>
                    <Badge
                      count={g.items.length}
                      overflowCount={99999}
                      color={g.color}
                    />
                  </div>
                  <span className="text-xs text-gray-400">
                    {g.items.length} {g.items.length === 1 ? 'competition' : 'competitions'}
                  </span>
                </div>

                <CardGrid
                  items={g.items}
                  type="competition"
                  onNavigate={onNavigate}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onViewChildren={handleViewChildren}
                  defaultPageSize={20}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          {(() => {
            const activeConfig = groupConfigs.find((g) => g.key === selectedGroup);
            const activeItems = activeConfig?.items || [];

            if (activeItems.length === 0) {
              return (
                <div className="py-12 bg-white rounded-lg border border-gray-100 shadow-sm">
                  <Empty description={`No ${activeConfig?.label.toLowerCase()} competitions found`} />
                </div>
              );
            }

            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    {activeConfig?.icon}
                    <h3 className="font-bold text-sm text-gray-800 tracking-wide uppercase">
                      {activeConfig?.label}
                    </h3>
                    <Badge
                      count={activeItems.length}
                      overflowCount={99999}
                      color={activeConfig?.color}
                    />
                  </div>
                  <span className="text-xs text-gray-400">
                    {activeItems.length} {activeItems.length === 1 ? 'competition' : 'competitions'}
                  </span>
                </div>

                <CardGrid
                  items={activeItems}
                  type="competition"
                  onNavigate={onNavigate}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onViewChildren={handleViewChildren}
                  defaultPageSize={20}
                />
              </div>
            );
          })()}
        </div>
      )}

      {/* Sub-Competitions Drawer */}
      <SubCompetitionsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        parentComp={drawerParent}
        allCompetitions={items}
        onEdit={onEdit}
        onDelete={onDelete}
        onNavigate={onNavigate}
      />
    </div>
  );
}
