'use client';

import React, { useState, useMemo } from 'react';
import { Tree, Input } from 'antd';
import type { DataNode } from 'antd/es/tree';
import {
  CaretDownFilled,
  CaretRightFilled,
  SearchOutlined,
} from '@ant-design/icons';
import { NationItem } from '../services/api';

export interface UnitTreeProps {
  nations?: NationItem[];
  selectedKey?: string;
  onSelectNode: (key: string, nodeData?: any) => void;
  showAllOption?: boolean;
  allOptionLabel?: string;
  allowSelectConfed?: boolean;
  confedOnly?: boolean;
  includeExtinct?: boolean;
  className?: string;
  height?: number | string;
}

export const ORDERED_CONFED_CODES = ['AFC', 'CAF', 'CONCACAF', 'CONMEBOL', 'OFC', 'UEFA'];

export const CONFEDERATION_META: Record<
  string,
  { name: string; icon: string; order: number }
> = {
  AFC: { name: 'Châu Á', icon: '🌏', order: 1 },
  CAF: { name: 'Châu Phi', icon: '🌍', order: 2 },
  CONCACAF: { name: 'Bắc, Trung Mỹ & Caribe', icon: '🌎', order: 3 },
  CONMEBOL: { name: 'Nam Mỹ', icon: '🌎', order: 4 },
  OFC: { name: 'Châu Đại Dương', icon: '🌏', order: 5 },
  UEFA: { name: 'Châu Âu', icon: '🇪🇺', order: 6 },
  EXTINCT: { name: 'Quốc gia lịch sử / Giải thể', icon: '🏛️', order: 7 },
};

export const CONFEDERATION_LIST = [
  { value: 'all', code: 'ALL', name: 'All', icon: '🌍' },
  { value: 'AFC', code: 'AFC', name: 'AFC', icon: '🌏' },
  { value: 'CAF', code: 'CAF', name: 'CAF', icon: '🌍' },
  { value: 'CONCACAF', code: 'CONCACAF', name: 'CONCACAF', icon: '🌎' },
  { value: 'CONMEBOL', code: 'CONMEBOL', name: 'CONMEBOL', icon: '🌎' },
  { value: 'OFC', code: 'OFC', name: 'OFC', icon: '🌏' },
  { value: 'UEFA', code: 'UEFA', name: 'UEFA', icon: '🇪🇺' },
  { value: 'EXTINCT', code: 'EXTINCT', name: 'Extinct', icon: '🏛️' },
];

export default function UnitTree({
  nations = [],
  selectedKey,
  onSelectNode,
  showAllOption = true,
  allOptionLabel = 'All',
  allowSelectConfed = false,
  confedOnly = false,
  includeExtinct,
  className = '',
  height = 360,
}: UnitTreeProps) {
  const isNationScreen = includeExtinct ?? confedOnly;
  const [keyword, setKeyword] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(() => {
    if (selectedKey && selectedKey !== 'all' && !confedOnly) {
      const targetNation = nations.find((n) => String(n.id) === String(selectedKey));
      if (targetNation) {
        let ck = '';
        if (typeof targetNation.confed === 'string') ck = targetNation.confed.toUpperCase();
        else if (targetNation.confed?.code) ck = targetNation.confed.code.toUpperCase();
        else if (targetNation.confed_id) ck = String(targetNation.confed_id).toUpperCase();
        if (ck) return [`confed_${ck}`];
      }
    }
    return [];
  });
  const [autoExpandParent, setAutoExpandParent] = useState(true);

  // Xây dựng cây đơn vị
  const rawTreeData: DataNode[] = useMemo(() => {
    // 1. Chế độ chỉ hiển thị Cấp 1 (Châu lục / Liên đoàn cho màn list-nations)
    if (confedOnly) {
      const nodes: DataNode[] = [];
      if (showAllOption) {
        nodes.push({
          key: 'all',
          title: 'ALL',
          isLeaf: true,
          className: 'tree-node-level-1',
          level: 1,
        } as any);
      }

      const confedCodes = [...ORDERED_CONFED_CODES];
      if (isNationScreen) {
        confedCodes.push('EXTINCT');
      }

      confedCodes.forEach((code) => {
        nodes.push({
          key: code,
          title: code,
          isLeaf: true,
          className: 'tree-node-level-1',
          level: 1,
        } as any);
      });
      return nodes;
    }

    // 2. Chế độ phân cấp ngoài màn nation:
    // Cấp 1: ALL, AFC, CAF, CONCACAF, CONMEBOL, OFC, UEFA (không có EXTINCT)
    // Cấp 2: Danh sách quốc gia theo cấp 1 (trừ ALL)
    const groups: Record<string, NationItem[]> = {};
    ORDERED_CONFED_CODES.forEach((code) => {
      groups[code] = [];
    });
    if (isNationScreen) {
      groups['EXTINCT'] = [];
    }

    nations.forEach((n) => {
      let confedKey = '';
      if (typeof n.confed === 'string') {
        confedKey = n.confed.toUpperCase();
      } else if (n.confed && typeof n.confed === 'object') {
        confedKey = (n.confed.code || n.confed.name || '').toUpperCase();
      } else if (n.confed_id) {
        confedKey = String(n.confed_id).toUpperCase();
      }

      // Chỉ gom vào các liên đoàn hợp lệ (loại bỏ EXTINCT nếu không ở màn nation)
      if (ORDERED_CONFED_CODES.includes(confedKey)) {
        groups[confedKey].push(n);
      } else if (confedKey === 'EXTINCT' && isNationScreen) {
        groups['EXTINCT'].push(n);
      }
    });

    const nodes: DataNode[] = [];

    // Cấp 1: ALL (không có cấp 2)
    if (showAllOption) {
      nodes.push({
        key: 'all',
        title: 'ALL',
        isLeaf: true,
        className: 'tree-node-level-1',
        level: 1,
      } as any);
    }

    // Cấp 1: Các liên đoàn theo thứ tự AFC, CAF, CONCACAF, CONMEBOL, OFC, UEFA
    const activeConfedCodes = [...ORDERED_CONFED_CODES];
    if (isNationScreen) {
      activeConfedCodes.push('EXTINCT');
    }

    activeConfedCodes.forEach((confedKey) => {
      const list = groups[confedKey] || [];

      const sortedNations = [...list].sort((a, b) => {
        const nameA = a.name_sh || a.name || a.name_lg || '';
        const nameB = b.name_sh || b.name || b.name_lg || '';
        return nameA.localeCompare(nameB);
      });

      nodes.push({
        key: `confed_${confedKey}`,
        title: confedKey,
        selectable: allowSelectConfed,
        className: 'tree-node-level-1',
        level: 1,
        children: sortedNations.map((n) => {
          const code = (n.name_3l || (n as any).code || (n as any).code3 || '---').toUpperCase();
          const shortName = n.name_sh || n.name || n.name_lg || '';
          return {
            key: String(n.id),
            title: `${code} ${shortName}`,
            isLeaf: true,
            selectable: true,
            className: 'tree-node-level-2',
            level: 2,
            nationData: n,
            code3: code,
            shortName: shortName,
          };
        }),
      } as any);
    });

    return nodes;
  }, [confedOnly, isNationScreen, nations, showAllOption, allowSelectConfed]);

  // Lọc cây theo từ khóa tìm kiếm
  const filteredTreeData = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return rawTreeData;

    const filterNodes = (items: DataNode[]): DataNode[] => {
      const result: DataNode[] = [];
      for (const item of items) {
        const titleStr = String(item.title || '').toLowerCase();
        const matches = titleStr.includes(q);

        if (item.children && item.children.length > 0) {
          const matchedChildren = filterNodes(item.children);
          if (matches || matchedChildren.length > 0) {
            result.push({
              ...item,
              children: matchedChildren.length > 0 ? matchedChildren : item.children,
            });
          }
        } else if (matches) {
          result.push(item);
        }
      }
      return result;
    };

    return filterNodes(rawTreeData);
  }, [rawTreeData, keyword]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setKeyword(val);
    if (val.trim()) {
      // Tự động mở rộng tất cả các nhánh khi tìm kiếm
      const allParentKeys: React.Key[] = [];
      const collectKeys = (nodes: DataNode[]) => {
        nodes.forEach((node) => {
          if (node.children && node.children.length > 0) {
            allParentKeys.push(node.key);
            collectKeys(node.children);
          }
        });
      };
      collectKeys(rawTreeData);
      setExpandedKeys(allParentKeys);
      setAutoExpandParent(true);
    }
  };

  const handleSelect = (selectedKeys: React.Key[], info: any) => {
    if (!selectedKeys || selectedKeys.length === 0) return;
    const key = String(selectedKeys[0]);

    // Nếu là click vào node confed mà không cho phép chọn confed thì chỉ mở/đóng nhánh
    if (key.startsWith('confed_') && !allowSelectConfed) {
      setExpandedKeys((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      );
      return;
    }

    onSelectNode(key, info.node);
  };

  return (
    <div className={`flex flex-col space-y-2.5 ${className}`}>
      {/* Ô tìm kiếm đơn vị */}
      <Input
        placeholder="Search..."
        prefix={<SearchOutlined className="text-slate-400 mr-1" />}
        value={keyword}
        onChange={handleSearchChange}
        allowClear
        size="middle"
        className="rounded-lg bg-slate-50 hover:bg-white focus:bg-white border-slate-200"
      />

      {/* Khung hiển thị Cây đơn vị */}
      <div
        style={{ maxHeight: height }}
        className="overflow-y-auto mobile-frame-scroll border border-slate-200/90 rounded-xl p-2 bg-white shadow-2xs"
      >
        <Tree
          blockNode
          treeData={filteredTreeData}
          selectedKeys={selectedKey ? [selectedKey] : []}
          expandedKeys={expandedKeys}
          autoExpandParent={autoExpandParent}
          onExpand={(keys) => {
            setExpandedKeys(keys);
            setAutoExpandParent(false);
          }}
          onSelect={handleSelect}
          switcherIcon={({ expanded }) => (
            <span className="flex items-center justify-center w-full h-full text-slate-500">
              {expanded ? (
                <CaretDownFilled className="text-[10px]" />
              ) : (
                <CaretRightFilled className="text-[10px]" />
              )}
            </span>
          )}
          titleRender={(node: any) => {
            const isSelected = selectedKey === String(node.key);
            const isLevel1 = node.level === 1;

            if (!isLevel1) {
              const code3 = node.code3 || node.nationData?.name_3l || '---';
              const shortName = node.shortName || node.nationData?.name_sh || node.nationData?.name || '';

              return (
                <div className="flex items-center gap-2 w-full min-w-0 h-full select-none">
                  <span
                    className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider flex-shrink-0 border leading-none ${
                      isSelected
                        ? 'bg-blue-100 text-blue-700 border-blue-300'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {code3}
                  </span>
                  <span
                    className={`truncate flex-1 text-xs leading-normal ${
                      isSelected
                        ? 'font-bold text-blue-700'
                        : 'text-slate-700 hover:text-blue-600'
                    }`}
                  >
                    {shortName}
                  </span>
                </div>
              );
            }

            // Level 1: ALL, AFC, CAF, CONCACAF, CONMEBOL, OFC, UEFA, EXTINCT
            return (
              <div className="flex items-center w-full min-w-0 h-full select-none">
                <span
                  className={`truncate flex-1 text-xs font-semibold leading-normal ${
                    isSelected ? 'font-bold text-blue-700' : 'text-blue-950'
                  }`}
                >
                  {node.title}
                </span>
              </div>
            );
          }}
          className="unit-tree-directory text-xs"
        />
      </div>
    </div>
  );
}
