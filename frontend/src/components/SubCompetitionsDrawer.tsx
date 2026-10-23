'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Drawer,
  Button,
  Tag,
  Input,
  Empty,
  Spin,
  Tooltip,
  Badge,
  message,
} from 'antd';
import {
  ApartmentOutlined,
  SearchOutlined,
  PlusOutlined,
  LinkOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { fetchSubCompetitions } from '../services/api';
import EntityCard from './EntityCard';
import RecordModal from './RecordModal';
import { RecordType } from '../types';

interface SubCompetitionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  parentComp: any | null;
  allCompetitions?: any[];
  onEdit?: (record: any) => void;
  onDelete?: (record: any) => void;
  onNavigate?: (step: any) => void;
  onRefreshParent?: () => void;
}

export default function SubCompetitionsDrawer({
  isOpen,
  onClose,
  parentComp,
  allCompetitions = [],
  onEdit,
  onDelete,
  onNavigate,
  onRefreshParent,
}: SubCompetitionsDrawerProps) {
  const router = useRouter();
  const [subComps, setSubComps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Load sub-competitions
  const loadSubCompetitions = useCallback(async (forceRefresh = false) => {
    if (!parentComp?.id) return;

    // Use in-memory matching first if available
    const localChildren = allCompetitions.filter(
      (c) => String(c.parent_id) === String(parentComp.id)
    );
    if (localChildren.length > 0 && !forceRefresh) {
      setSubComps(localChildren);
    }

    setLoading(true);
    try {
      const fetched = await fetchSubCompetitions(String(parentComp.id), forceRefresh);
      setSubComps(fetched);
    } catch (err: any) {
      console.error('Failed to fetch sub-competitions:', err);
      if (localChildren.length === 0) {
        message.error('Failed to load sub-competitions');
      }
    } finally {
      setLoading(false);
    }
  }, [parentComp?.id, allCompetitions]);

  useEffect(() => {
    if (isOpen && parentComp?.id) {
      setFilterText('');
      loadSubCompetitions(false);
    }
  }, [isOpen, parentComp?.id, loadSubCompetitions]);

  // Filtered children
  const filteredChildren = useMemo(() => {
    if (!filterText.trim()) return subComps;
    const q = filterText.toLowerCase();
    return subComps.filter((c) => {
      const name = (c.long_name || c.short_name || '').toLowerCase();
      const code = (c.three_letter_name || '').toLowerCase();
      const idStr = String(c.id);
      const cat = (c.categories || '').toLowerCase();
      return name.includes(q) || code.includes(q) || idStr.includes(q) || cat.includes(q);
    });
  }, [subComps, filterText]);

  const handleDeleteChild = async (child: any) => {
    if (onDelete) {
      await onDelete(child);
      setSubComps((prev) => prev.filter((c) => String(c.id) !== String(child.id)));
      onRefreshParent?.();
    }
  };

  const handleNavigateChild = (step: any) => {
    onClose();
    if (onNavigate) {
      onNavigate(step);
    } else if (step?.id) {
      router.push(`/comp/${step.id}`);
    }
  };

  const parentTitle = parentComp?.short_name || parentComp?.long_name || `Competition ${parentComp?.id}`;

  return (
    <>
      <Drawer
        title={
          <div className="flex items-center justify-between gap-3 pr-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
                <ApartmentOutlined className="text-amber-600 text-base" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-gray-800 truncate">
                    Sub-Competitions
                  </span>
                  <Badge
                    count={subComps.length}
                    overflowCount={999}
                    style={{ backgroundColor: '#d97706' }}
                  />
                </div>
                <div className="text-xs text-gray-500 truncate font-normal">
                  Parent: <strong className="text-amber-700">{parentTitle}</strong> (ID: {parentComp?.id})
                </div>
              </div>
            </div>

            {parentComp?.id && (
              <Tooltip title="Open Parent Competition Page">
                <Button
                  size="small"
                  type="default"
                  icon={<LinkOutlined />}
                  onClick={() => {
                    onClose();
                    router.push(`/comp/${parentComp.id}`);
                  }}
                  className="text-xs shrink-0"
                >
                  Parent Page
                </Button>
              </Tooltip>
            )}
          </div>
        }
        placement="right"
        width={typeof window !== 'undefined' && window.innerWidth < 960 ? '100%' : 880}
        onClose={onClose}
        open={isOpen}
        destroyOnClose
        className="sub-competitions-drawer"
      >
        <div className="flex flex-col h-full gap-4">
          {/* Parent Summary Card */}
          {parentComp && (
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tag color="gold" className="m-0 font-bold text-xs">
                    ID: {parentComp.id}
                  </Tag>
                  {parentComp.three_letter_name && (
                    <Tag color="blue" className="m-0 font-bold text-xs">
                      {parentComp.three_letter_name}
                    </Tag>
                  )}
                  {parentComp.categories && (
                    <Tag color="cyan" className="m-0 text-xs">
                      {parentComp.categories}
                    </Tag>
                  )}
                </div>
                <Button
                  size="small"
                  type="text"
                  icon={<ReloadOutlined className={loading ? 'animate-spin' : ''} />}
                  onClick={() => loadSubCompetitions(true)}
                  className="text-gray-500 hover:text-amber-600"
                  title="Reload sub-competitions"
                />
              </div>

              <div className="text-xs text-gray-700">
                <span className="font-semibold">{parentComp.long_name}</span>
                {parentComp.short_name && parentComp.short_name !== parentComp.long_name && (
                  <span className="text-gray-500 ml-1.5 font-normal">
                    ({parentComp.short_name})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Search Toolbar */}
          <div className="flex items-center justify-between gap-2">
            <Input
              prefix={<SearchOutlined className="text-gray-400 text-xs" />}
              placeholder="Filter sub-competitions..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              allowClear
              size="middle"
              className="flex-1 text-xs"
            />
            <Button
              type="primary"
              size="middle"
              icon={<PlusOutlined />}
              onClick={() => setIsAddModalOpen(true)}
              style={{ backgroundColor: '#d97706', borderColor: '#d97706' }}
              className="shrink-0 text-xs font-semibold"
            >
              Add Child Comp
            </Button>
          </div>

          {/* Sub-competitions List using shared EntityCard */}
          <div className="flex-1 overflow-y-auto pr-1">
            {loading && subComps.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center gap-3 text-gray-500">
                <Spin size="large" />
                <span className="text-xs">Loading sub-competitions...</span>
              </div>
            ) : filteredChildren.length === 0 ? (
              <div className="py-16 bg-gray-50/60 rounded-xl border border-gray-100">
                <Empty
                  description={
                    filterText
                      ? `No sub-competitions match "${filterText}"`
                      : 'No sub-competitions found for this parent'
                  }
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2">
                {filteredChildren.map((child) => (
                  <EntityCard
                    key={child.id}
                    type="competition"
                    data={{
                      ...child,
                      // Ensure parent metadata is displayed properly
                      parent_id: child.parent_id || parentComp?.id,
                      parent_name:
                        child.parent_name ||
                        child.parent_short_name ||
                        parentComp?.short_name ||
                        parentComp?.long_name,
                      nation: child.nation || parentComp?.nation,
                      nation_id: child.nation_id || parentComp?.nation_id,
                      nation_three_letter:
                        child.nation_three_letter ||
                        parentComp?.nation_three_letter ||
                        parentComp?.three_letter_name,
                    }}
                    onNavigate={handleNavigateChild}
                    onEdit={onEdit}
                    onDelete={handleDeleteChild}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="pt-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing <strong>{filteredChildren.length}</strong> of <strong>{subComps.length}</strong> sub-competitions
            </span>
            <Button size="small" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Add Sub-Competition Modal */}
      {isAddModalOpen && (
        <RecordModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            loadSubCompetitions(true);
            onRefreshParent?.();
          }}
          type={RecordType.COMPETITION}
          initialData={{
            parent_id: parentComp?.id ? String(parentComp.id) : undefined,
            nation_id: parentComp?.nation_id ? String(parentComp.nation_id) : undefined,
            confed_id: parentComp?.confed_id ? String(parentComp.confed_id) : undefined,
            categories: parentComp?.categories || undefined,
          }}
          defaultNationId={parentComp?.nation_id ? String(parentComp.nation_id) : undefined}
          defaultParentId={parentComp?.id ? String(parentComp.id) : undefined}
        />
      )}
    </>
  );
}
