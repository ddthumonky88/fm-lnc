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
      const upper = key.trim().toUpperCase();
      if (upper === '[REMOVE]' || upper === 'REMOVE' || upper.includes('REMOVE')) return 4;
      if (upper === '[OTHER]' || upper === 'OTHER' || upper === '[OTHERS]' || upper === 'OTHERS' || upper.includes('OTHER')) return 3;
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

    const resultGroups: CityCategoryGroup[] = sortedKeys.map((key) => ({
      key,
      label: key,
      isUncategorized: false,
      items: map.get(key)!,
    }));

    if (uncategorizedItems.length > 0) {
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

  if (loading) {
    return (
      <div className="text-center py-16 text-sm text-gray-500 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span>Loading cities...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-12 bg-white rounded-lg border border-gray-100 shadow-sm">
        <Empty description={emptyText} />
      </div>
    );
  }

  // If there's only 1 group or none, render standard grid
  if (groups.length <= 1) {
    return (
      <CardGrid
        items={items}
        type="city"
        onNavigate={onNavigate}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyText={emptyText}
        defaultPageSize={20}
      />
    );
  }

  const activeGroup =
    selectedCategory !== 'all' ? groups.find((g) => g.key === selectedCategory) : null;

  return (
    <div className="space-y-4">
      {/* Category / Region Filter Toolbar with Select */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/80 backdrop-blur-sm p-2.5 rounded-xl border border-gray-200/80 shadow-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs font-semibold text-gray-600 shrink-0">Region:</span>
          <Select
            showSearch
            value={selectedCategory}
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
          <span className="text-xs text-gray-300 font-medium hidden md:inline">|</span>
          <div className="text-xs text-gray-500 font-medium whitespace-nowrap">
            {groups.length} regions &bull; {items.length} cities
          </div>
        </div>

        {extraRight && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {extraRight}
          </div>
        )}
      </div>

      {/* Render Single Region Selected */}
      {selectedCategory !== 'all' && activeGroup ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-indigo-50 text-indigo-600">
                <EnvironmentOutlined />
              </span>
              <h3 className="font-bold text-sm text-gray-800 tracking-wide">
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
            defaultPageSize={20}
          />
        </div>
      ) : (
        /* All Regions: do not group, render single unified grid */
        <CardGrid
          items={items}
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
