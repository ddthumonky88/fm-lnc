'use client';

import React, { useState, useEffect } from 'react';
import { Pagination, Empty } from 'antd';
import EntityCard from './EntityCard';
import { EntityTypeValue } from '../types';

interface CardGridProps {
  items: any[];
  type: EntityTypeValue;
  loading?: boolean;
  cardSize?: 'small' | 'large';
  largeStyle?: '1-line' | '2-line';
  cardStyle?: '1-line' | '2-line';
  onNavigate?: (step: any) => void;
  onEdit?: (record: any) => void;
  onDelete?: (record: any) => void;
  onViewChildren?: (record: any) => void;
  emptyText?: string;
  defaultPageSize?: number;
  columns?: number;
  serverPagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

export default function CardGrid({
  items,
  type,
  loading,
  cardSize,
  largeStyle,
  cardStyle,
  onNavigate,
  onEdit,
  onDelete,
  onViewChildren,
  emptyText = 'No records found',
  defaultPageSize = 20,
  columns,
  serverPagination,
}: CardGridProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Keep page within valid bounds when items or pageSize changes (client mode)
  useEffect(() => {
    if (!serverPagination) {
      if (items.length === 0) {
        setPage(1);
      } else {
        const maxPage = Math.max(1, Math.ceil(items.length / pageSize));
        if (page > maxPage) {
          setPage(maxPage);
        }
      }
    }
  }, [items.length, pageSize, serverPagination, page]);

  // Reset page to 1 when type changes
  useEffect(() => {
    if (!serverPagination) {
      setPage(1);
    }
  }, [type, serverPagination]);

  useEffect(() => {
    if (!serverPagination) {
      setPageSize(defaultPageSize);
    }
  }, [defaultPageSize, serverPagination]);

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

  const isServer = Boolean(serverPagination);
  const totalRecords = isServer ? serverPagination!.total : items.length;
  const currentPageSize = isServer ? serverPagination!.pageSize : pageSize;
  const maxPage = Math.max(1, Math.ceil(totalRecords / currentPageSize));
  const currentPage = isServer ? serverPagination!.current : Math.min(page, maxPage);

  const startIndex = (currentPage - 1) * currentPageSize;
  const pagedItems = isServer ? items : items.slice(startIndex, startIndex + currentPageSize);
  const showingStart = totalRecords === 0 ? 0 : startIndex + 1;
  const showingEnd = Math.min(startIndex + pagedItems.length, totalRecords);

  const entityTypeStr = String(type).toLowerCase();
  const isSmall =
    cardSize !== undefined
      ? cardSize === 'small'
      : entityTypeStr === 'nation' ||
        entityTypeStr === 'stadium' ||
        entityTypeStr === 'city';

  const gridClasses = isSmall
    ? 'grid grid-cols-2 gap-2'
    : 'grid grid-cols-1 gap-3';

  return (
    <div>
      <div className={gridClasses}>
        {pagedItems.map((item) => (
          <EntityCard
            key={item.id}
            type={type}
            data={item}
            cardSize={isSmall ? 'small' : 'large'}
            largeStyle={largeStyle || cardStyle}
            onNavigate={onNavigate}
            onEdit={onEdit}
            onDelete={onDelete}
            onViewChildren={onViewChildren}
          />
        ))}
      </div>

      {totalRecords > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-5 pt-3 border-t border-gray-100 gap-2">
          <span className="text-xs text-gray-500">
            Showing {showingStart} - {showingEnd} of {totalRecords} records
          </span>
          <Pagination
            current={currentPage}
            pageSize={currentPageSize}
            total={totalRecords}
            pageSizeOptions={['10', '20', '30', '40', '50', '100']}
            showSizeChanger
            showQuickJumper
            size="small"
            responsive
            onChange={(p, s) => {
              if (isServer) {
                serverPagination!.onChange(p, s);
              } else {
                setPage(p);
                setPageSize(s);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
