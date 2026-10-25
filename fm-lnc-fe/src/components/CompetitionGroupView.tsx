'use client';

import React, { useState, useMemo } from 'react';
import { Badge, Empty, Select } from 'antd';
import {
  StarOutlined,
  GlobalOutlined,
  AppstoreOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import CardGrid from './CardGrid';
import SubCompetitionsDrawer from './SubCompetitionsDrawer';
import { CompIcon, AwardIcon } from './EntityIcons';

export type CompetitionGroupKey = 'all' | 'league' | 'cup' | 'youth' | 'other';
export type CompetitionCategory = 'league' | 'cup' | 'youth' | 'other';

export function getCompetitionGroup(target?: any): CompetitionCategory {
  if (!target) return 'other';
  const item = typeof target === 'object' ? target : { type: target, categories: target };
  const id = String(item?.id || '');
  if (id === '[OTHER]' || id === '[EXTINCT]' || item?.is_virtual) {
    return 'other';
  }
  const cat = String(item?.type || item?.categories || item?.category || '').trim().toLowerCase();
  if (!cat) return 'other';
  if (cat.includes('youth')) return 'youth';
  if (cat.includes('cup')) return 'cup';
  if (cat.includes('league') || cat.includes('division') || cat.includes('tier') || cat.includes('lower leagues')) {
    return 'league';
  }
  return 'other';
}

const GROUP_PRIORITY: Record<CompetitionCategory, number> = {
  league: 1,
  cup: 2,
  youth: 3,
  other: 4,
};

function getLeagueTier(categoryStr: string): number {
  const match = categoryStr.match(/league\s*\(\s*(\d+)\s*\)/i) || categoryStr.match(/\((\d+)\)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 9999;
}

function getOtherWeight(item: any): number {
  const id = String(item?.id || '');
  if (id === '[EXTINCT]' || item?.virtual_type === 'EXTINCT') return 3;
  if (id === '[OTHER]' || item?.virtual_type === 'OTHER' || item?.is_virtual) return 2;
  return 1;
}

export function sortCompetitionsByCategory(a: any, b: any): number {
  const groupA = getCompetitionGroup(a);
  const groupB = getCompetitionGroup(b);

  // 1. Overall Category group priority: league (1) > cup (2) > youth (3) > other (4)
  if (groupA !== groupB) {
    return GROUP_PRIORITY[groupA] - GROUP_PRIORITY[groupB];
  }

  // 2. Within 'league': league (1) > league (2) > ...
  if (groupA === 'league') {
    const catA = String(a.type || a.categories || '').trim();
    const catB = String(b.type || b.categories || '').trim();
    const tierA = getLeagueTier(catA);
    const tierB = getLeagueTier(catB);
    if (tierA !== tierB) {
      return tierA - tierB;
    }
    const catComp = catA.localeCompare(catB, undefined, { numeric: true, sensitivity: 'base' });
    if (catComp !== 0) return catComp;
  }

  // 3. Within 'other': ... > [OTHER] > [EXTINCT]
  if (groupA === 'other') {
    const weightA = getOtherWeight(a);
    const weightB = getOtherWeight(b);
    if (weightA !== weightB) {
      return weightA - weightB;
    }
    const catA = String(a.type || a.categories || '').trim();
    const catB = String(b.type || b.categories || '').trim();
    const catComp = catA.localeCompare(catB, undefined, { numeric: true, sensitivity: 'base' });
    if (catComp !== 0) return catComp;
  }

  // 4. Within 'cup' or 'youth'
  if (groupA === 'cup' || groupA === 'youth') {
    const catA = String(a.type || a.categories || '').trim();
    const catB = String(b.type || b.categories || '').trim();
    const catComp = catA.localeCompare(catB, undefined, { numeric: true, sensitivity: 'base' });
    if (catComp !== 0) return catComp;
  }

  // Fallback: alphabetical by name
  const nameA = a.long_name || a.short_name || a.name || '';
  const nameB = b.long_name || b.short_name || b.name || '';
  return String(nameA).localeCompare(String(nameB), undefined, { numeric: true, sensitivity: 'base' });
}

interface CompetitionGroupViewProps {
  items: any[];
  loading?: boolean;
  onNavigate?: (step: any) => void;
  onEdit?: (record: any) => void;
  onDelete?: (record: any) => void;
  emptyText?: string;
  extraRight?: React.ReactNode;
}

export default function CompetitionGroupView({
  items,
  loading,
  onNavigate,
  onEdit,
  onDelete,
  emptyText = 'No competitions found',
  extraRight,
}: CompetitionGroupViewProps) {
  const [selectedGroup, setSelectedGroup] = useState<CompetitionGroupKey>('all');
  const [drawerParent, setDrawerParent] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Visible items: parent/top-level competitions (sub-competitions are organized inside parent drawer)
  // Hide independent clubs containers ([OTHER], [EXTINCT]) if they have 0 clubs
  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (item.parent_id) return false;
      const isOther = item.id === '[OTHER]' || item.virtual_type === 'OTHER';
      const isExtinct = item.id === '[EXTINCT]' || item.virtual_type === 'EXTINCT';
      if ((isOther || isExtinct) && (item.clubsCount || item.totalChildren || 0) === 0) {
        return false;
      }
      return true;
    });
  }, [items]);

  const handleViewChildren = (comp: any) => {
    setDrawerParent(comp);
    setIsDrawerOpen(true);
  };

  const sortedAllItems = useMemo(() => {
    return [...visibleItems].sort(sortCompetitionsByCategory);
  }, [visibleItems]);

  const { leagueItems, cupItems, youthItems, otherItems } = useMemo(() => {
    const league: any[] = [];
    const cup: any[] = [];
    const youth: any[] = [];
    const other: any[] = [];

    visibleItems.forEach((item) => {
      const g = getCompetitionGroup(item);
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
        icon: <CompIcon size={16} className="text-amber-500" />,
        color: '#1677ff',
        items: leagueItems,
      },
      {
        key: 'cup' as const,
        label: 'Cup',
        icon: <AwardIcon size={16} className="text-emerald-500" />,
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

  const renderToolbar = () => (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/80 backdrop-blur-sm p-2.5 rounded-xl border border-gray-200/80 shadow-xs">
      <div className="flex items-center gap-2.5 flex-wrap">
        <Select
          value={selectedGroup}
          onChange={(val) => setSelectedGroup(val as CompetitionGroupKey)}
          options={selectOptions}
          className="w-52 text-xs"
          suffixIcon={<FilterOutlined className="text-gray-400" />}
        />
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
        <CardGrid
          items={sortedAllItems}
          type="competition"
          onNavigate={onNavigate}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewChildren={handleViewChildren}
          emptyText={emptyText}
          defaultPageSize={20}
        />
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
