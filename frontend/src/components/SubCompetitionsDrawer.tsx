'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Drawer,
  Button,
  Tag,
  Empty,
  Spin,
  Tooltip,
  Badge,
  message,
} from 'antd';
import {
  ApartmentOutlined,
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
      loadSubCompetitions(false);
    }
  }, [isOpen, parentComp?.id, loadSubCompetitions]);

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
          <div className="flex items-center gap-3 py-1">
            <span className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
              <ApartmentOutlined className="text-amber-600 text-lg" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-gray-900 truncate">
                  {parentTitle}
                </span>
                <Badge
                  count={subComps.length}
                  overflowCount={999}
                  style={{ backgroundColor: '#d97706' }}
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                {parentComp?.id && (
                  <Tag color="gold" className="m-0 font-mono font-bold text-[11px] leading-4">
                    ID: {parentComp.id}
                  </Tag>
                )}
                {parentComp?.three_letter_name && (
                  <Tag color="blue" className="m-0 font-bold text-[11px] leading-4">
                    {parentComp.three_letter_name}
                  </Tag>
                )}
                {parentComp?.categories && (
                  <Tag color="cyan" className="m-0 text-[11px] leading-4">
                    {parentComp.categories}
                  </Tag>
                )}
              </div>
            </div>
          </div>
        }
        extra={
          <div className="flex items-center gap-2">
            <Button
              type="primary"
              size="middle"
              icon={<PlusOutlined />}
              onClick={() => setIsAddModalOpen(true)}
              style={{ backgroundColor: '#d97706', borderColor: '#d97706' }}
              className="text-xs font-semibold"
            >
              Add Child Comp
            </Button>
            {parentComp?.id && (
              <Tooltip title="Open Parent Competition Page">
                <Button
                  size="middle"
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
            <Button
              size="middle"
              type="text"
              icon={<ReloadOutlined className={loading ? 'animate-spin' : ''} />}
              onClick={() => loadSubCompetitions(true)}
              className="text-gray-500 hover:text-amber-600"
              title="Reload sub-competitions"
            />
          </div>
        }
        placement="right"
        width={typeof window !== 'undefined' && window.innerWidth < 960 ? '100%' : 880}
        onClose={onClose}
        open={isOpen}
        destroyOnClose
        className="sub-competitions-drawer"
      >
        <div className="flex flex-col h-full gap-3">
          {/* Sub-competitions List using shared EntityCard */}
          <div className="flex-1 overflow-y-auto pr-1">
            {loading && subComps.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center gap-3 text-gray-500">
                <Spin size="large" />
                <span className="text-xs">Loading sub-competitions...</span>
              </div>
            ) : subComps.length === 0 ? (
              <div className="py-16 bg-gray-50/60 rounded-xl border border-gray-100">
                <Empty description="No sub-competitions found for this parent" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2">
                {subComps.map((child) => (
                  <EntityCard
                    key={child.id}
                    type="competition"
                    data={{
                      ...child,
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
              Total: <strong>{subComps.length}</strong> sub-competitions
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
