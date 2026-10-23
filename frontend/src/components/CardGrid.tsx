'use client';

import React, { useState, useEffect } from 'react';
import { Pagination, Empty } from 'antd';
import EntityCard from './EntityCard';
import { EntityType, EntityTypeValue } from '../types';

interface CardGridProps {
  items: any[];
  type: EntityTypeValue;
  loading?: boolean;
  onNavigate?: (step: any) => void;
  onEdit?: (record: any) => void;
  onDelete?: (record: any) => void;
  onViewChildren?: (record: any) => void;
  emptyText?: string;
  defaultPageSize?: number;
  columns?: number;
}

export default function CardGrid({
  items,
  type,
  loading,
  onNavigate,
  onEdit,
  onDelete,
  onViewChildren,
  emptyText = 'No records found',
  defaultPageSize = 20,
  columns,
}: CardGridProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Reset page to 1 when items change or type changes
  useEffect(() => {
    setPage(1);
  }, [items.length, type]);

  useEffect(() => {
    setPageSize(defaultPageSize);
  }, [defaultPageSize]);

  if (loading) {
    return (
      <div className="text-center py-16 text-sm text-gray-500 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span>Loading cards...</span>
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

  const startIndex = (page - 1) * pageSize;
  const pagedItems = items.slice(startIndex, startIndex + pageSize);

  const isFiveCols = String(type) === 'stadium' || String(type) === 'city' || String(type) === 'nation' || columns === 5;
  const gridClasses = isFiveCols
    ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5'
    : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4';

  return (
    <div>
      <div className={gridClasses}>
        {pagedItems.map((item) => (
          <EntityCard
            key={item.id}
            type={type}
            data={item}
            onNavigate={onNavigate}
            onEdit={onEdit}
            onDelete={onDelete}
            onViewChildren={onViewChildren}
          />
        ))}
      </div>

      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-5 pt-3 border-t border-gray-100 gap-2">
          <span className="text-xs text-gray-500">
            Showing {Math.min(startIndex + 1, items.length)} -{' '}
            {Math.min(startIndex + pageSize, items.length)} of {items.length} records
          </span>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={items.length}
            pageSizeOptions={['10', '20', '30', '40', '50', '100']}
            showSizeChanger
            showQuickJumper
            size="small"
            responsive
            onChange={(p, s) => {
              setPage(p);
              setPageSize(s);
            }}
          />
        </div>
      )}
    </div>
  );
}
