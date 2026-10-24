'use client';

import React, { useState, useMemo } from 'react';
import { Badge, Empty, Select } from 'antd';
import {
  EnvironmentOutlined,
  AppstoreOutlined,
  CompassOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import CardGrid from './CardGrid';
import { CityIcon } from './EntityIcons';

interface CityGroupViewProps {
  items: any[];
  loading?: boolean;
  onNavigate?: (step: any) => void;
  onEdit?: (record: any) => void;
  onDelete?: (record: any) => void;
  emptyText?: string;
  extraRight?: React.ReactNode;
}

export interface CityCategoryGroup {
  key: string;
  label: string;
  isUncategorized: boolean;
  items: any[];
}

export default function CityGroupView({
  items,
  loading,
  onNavigate,
  onEdit,
  onDelete,
  emptyText = 'No cities found',
  extraRight,
}: CityGroupViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Group cities by category / region
  const { groups, categoryList } = useMemo(() => {
    const map = new Map<string, any[]>();
    const uncategorizedItems: any[] = [];

    items.forEach((item) => {
      const rawCat = item.categories?.trim();
      if (!rawCat) {
        uncategorizedItems.push(item);
      } else {
        if (!map.has(rawCat)) {
          map.set(rawCat, []);
        }
        map.get(rawCat)!.push(item);
      }
    });

    // Sort categories alphabetically, but put [OTHER] and [REMOVE] at the end
    const getCategoryRank = (key: string): number => {
      if (!key) return 5;
      const upper = key.trim().toUpperCase();
      if (upper === '[REMOVE]' || upper === 'REMOVE' || upper.includes('REMOVE')) return 6;
      if (upper === '[OTHER]' || upper === 'OTHER' || upper === '[OTHERS]' || upper === 'OTHERS' || upper.includes('OTHER')) return 4;
      if (upper.startsWith('[')) return 2;
      return 1;
    };

    const sortedKeys = Array.from(map.keys()).sort((a, b) => {
      const rankA = getCategoryRank(a);
      const rankB = getCategoryRank(b);
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    const resultGroups: CityCategoryGroup[] = sortedKeys.map((key) => {
      const groupItems = (map.get(key) || []).sort((a, b) => {
        const nameA = a.long_name || a.name || a.short_name || '';
        const nameB = b.long_name || b.name || b.short_name || '';
        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
      });
      return {
        key,
        label: key,
        isUncategorized: false,
        items: groupItems,
      };
    });

    if (uncategorizedItems.length > 0) {
      uncategorizedItems.sort((a, b) => {
        const nameA = a.long_name || a.name || a.short_name || '';
        const nameB = b.long_name || b.name || b.short_name || '';
        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
      });
      resultGroups.push({
        key: '__uncategorized__',
        label: 'Uncategorized',
        isUncategorized: true,
        items: uncategorizedItems,
      });
    }

    return {
      groups: resultGroups,
      categoryList: resultGroups.map((g) => ({
        value: g.key,
        label: `${g.label} (${g.items.length})`,
      })),
    };
  }, [items]);

  // Sort all items by region (categories), with REMOVE always at the end
  const sortedAllItems = useMemo(() => {
    const getCategoryRank = (key: string): number => {
      if (!key) return 5;
      const upper = key.trim().toUpperCase();
      if (upper === '[REMOVE]' || upper === 'REMOVE' || upper.includes('REMOVE')) return 6;
      if (upper === '[OTHER]' || upper === 'OTHER' || upper === '[OTHERS]' || upper === 'OTHERS' || upper.includes('OTHER')) return 4;
      if (upper.startsWith('[')) return 2;
      return 1;
    };

    return [...items].sort((a, b) => {
      const catA = (a.categories || '').trim();
      const catB = (b.categories || '').trim();

      const rankA = getCategoryRank(catA);
      const rankB = getCategoryRank(catB);
      if (rankA !== rankB) {
        return rankA - rankB;
      }

      if (catA && catB && catA !== catB) {
        const catCmp = catA.localeCompare(catB, undefined, { numeric: true, sensitivity: 'base' });
        if (catCmp !== 0) return catCmp;
      }

      const nameA = a.long_name || a.name || a.short_name || '';
      const nameB = b.long_name || b.name || b.short_name || '';
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [items]);

  if (loading) {
    return (
      <div className="text-center py-16 text-sm text-gray-500 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span>Loading cities...</span>
      </div>
    );
  }

  // Calculate effective selected category so it safely falls back to 'all' if filtered out
  const effectiveCategory =
    selectedCategory === 'all'
      ? 'all'
      : categoryList.some((c) => c.value === selectedCategory)
      ? selectedCategory
      : 'all';

  const renderToolbar = () => (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/80 backdrop-blur-sm p-2.5 rounded-xl border border-gray-200/80 shadow-xs">
      <div className="flex items-center gap-2.5 flex-wrap">
        <Select
          showSearch
          value={effectiveCategory}
          onChange={(val) => setSelectedCategory(val || 'all')}
          options={[
            {
              value: 'all',
              label: `All Regions (${items.length})`,
            },
            ...categoryList,
          ]}
          filterOption={(input, option) =>
            (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
          }
          className="w-56 text-xs"
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

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        {renderToolbar()}
        <div className="py-12 bg-white rounded-lg border border-gray-100 shadow-sm">
          <Empty description={emptyText} />
        </div>
      </div>
    );
  }

  const activeGroup =
    effectiveCategory !== 'all' ? groups.find((g) => g.key === effectiveCategory) : null;

  return (
    <div className="space-y-4">
      {/* Category / Region Filter Toolbar with Select */}
      {renderToolbar()}

      {/* Render Single Region Selected */}
      {effectiveCategory !== 'all' && activeGroup ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <CityIcon size={18} />
              </span>
              <h3
                className={`font-bold text-sm tracking-wide ${
                  activeGroup.label.toUpperCase().includes('REMOVE') ||
                  activeGroup.label.toUpperCase().includes('OTHER') ||
                  activeGroup.label.toUpperCase().includes('EXTINCT')
                    ? 'text-red-600'
                    : 'text-gray-800'
                }`}
              >
                {activeGroup.label}
              </h3>
              <Badge
                count={activeGroup.items.length}
                overflowCount={99999}
                style={{ backgroundColor: '#4f46e5' }}
              />
            </div>
            <span className="text-xs text-gray-500">
              {activeGroup.items.length} {activeGroup.items.length === 1 ? 'city' : 'cities'}
            </span>
          </div>

          <CardGrid
            items={activeGroup.items}
            type="city"
            onNavigate={onNavigate}
            onEdit={onEdit}
            onDelete={onDelete}
            emptyText={emptyText}
            defaultPageSize={20}
          />
        </div>
      ) : (
        /* All Regions: do not group, render single unified grid sorted by region */
        <CardGrid
          items={sortedAllItems}
          type="city"
          onNavigate={onNavigate}
          onEdit={onEdit}
          onDelete={onDelete}
          emptyText={emptyText}
          defaultPageSize={20}
        />
      )}
    </div>
  );
}
