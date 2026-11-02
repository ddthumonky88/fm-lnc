'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Tree, Input } from 'antd';
import { DownOutlined, RightOutlined, CheckOutlined } from '@ant-design/icons';
import { NationItem, CompetitionItem, fetchDomesticCompetitions } from '../services/api';
import type { DataNode } from 'antd/es/tree';


export interface UnitTreeProps {
  mode?: 'comp' | 'club' | 'city' | 'stadium' | 'award' | 'nation' | 'default';
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
  WORLD: { name: 'Toàn cầu', icon: '🌐', order: 0 },
  AFC: { name: 'Châu Á', icon: '🌏', order: 1 },
  CAF: { name: 'Châu Phi', icon: '🌍', order: 2 },
  CONCACAF: { name: 'Bắc, Trung Mỹ & Caribe', icon: '🌎', order: 3 },
  CONMEBOL: { name: 'Nam Mỹ', icon: '🌎', order: 4 },
  OFC: { name: 'Châu Đại Dương', icon: '🌏', order: 5 },
  UEFA: { name: 'Châu Âu', icon: '🇪🇺', order: 6 },
  EXTINCT: { name: 'Quốc gia lịch sử / Giải thể', icon: '🏛️', order: 7 },
};

export default function UnitTree({
  mode,
  nations = [],
  selectedKey,
  onSelectNode,
  showAllOption = true,
  allOptionLabel = 'ALL',
  allowSelectConfed = false,
  confedOnly = false,
  includeExtinct,
  className = '',
  height = 360,
}: UnitTreeProps) {
  const currentMode = mode || (confedOnly ? 'nation' : 'default');
  const isNationScreen = currentMode === 'nation' || (includeExtinct ?? confedOnly);

  const [keyword, setKeyword] = useState('');
  const [nationCompsCache, setNationCompsCache] = useState<Record<string, CompetitionItem[]>>({});

  // Tự động mở rộng nhánh khi có selectedKey
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(() => {
    if (selectedKey && selectedKey !== 'all') {
      const keys: React.Key[] = [];
      let targetNationId = '';

      if (selectedKey.startsWith('nation_')) {
        targetNationId = selectedKey.replace('nation_', '');
      } else if (selectedKey.startsWith('comp_') || selectedKey.startsWith('oth_') || selectedKey.startsWith('ext_')) {
        if (selectedKey.startsWith('oth_')) targetNationId = selectedKey.replace('oth_', '');
        else if (selectedKey.startsWith('ext_')) targetNationId = selectedKey.replace('ext_', '');
      } else if (!selectedKey.startsWith('confed_') && !selectedKey.startsWith('intl_')) {
        targetNationId = selectedKey;
      }

      if (targetNationId) {
        const targetNation = nations.find((n) => String(n.id) === String(targetNationId));
        if (targetNation) {
          let ck = '';
          if (typeof targetNation.confed === 'string') ck = targetNation.confed.toUpperCase();
          else if (targetNation.confed?.code) ck = targetNation.confed.code.toUpperCase();
          else if (targetNation.confed_id) ck = String(targetNation.confed_id).toUpperCase();
          if (ck) keys.push(`confed_${ck}`);
        }
        if (currentMode === 'club') {
          keys.push(`nation_${targetNationId}`);
        }
      } else if (selectedKey.startsWith('intl_')) {
        const ck = selectedKey.replace('intl_', '');
        keys.push(`confed_${ck}`);
      }
      return keys;
    }
    return [];
  });
  const [autoExpandParent, setAutoExpandParent] = useState(true);

  // Pre-load comps cho nation đã chọn khi mở modal ở màn club
  useEffect(() => {
    if (currentMode === 'club' && selectedKey && selectedKey !== 'all') {
      let targetNationId = '';
      if (selectedKey.startsWith('nation_')) targetNationId = selectedKey.replace('nation_', '');
      else if (selectedKey.startsWith('oth_')) targetNationId = selectedKey.replace('oth_', '');
      else if (selectedKey.startsWith('ext_')) targetNationId = selectedKey.replace('ext_', '');

      if (targetNationId && nationCompsCache[targetNationId] === undefined) {
        fetchDomesticCompetitions(targetNationId, { size: 100 })
          .then((res: any) => {
            const list = Array.isArray(res) ? res : res?.content || [];
            const regularComps = list.filter(
              (c: any) => !c.is_virtual && !String(c.id).startsWith('oth-') && !String(c.id).startsWith('ext-')
            );
            setNationCompsCache((prev) => ({
              ...prev,
              [targetNationId]: regularComps,
            }));
          })
          .catch(() => {});
      }
    }
  }, [currentMode, selectedKey, nationCompsCache]);

  // Handler load data bất đồng bộ cho Cấp 3 màn club
  const handleLoadData = (treeNode: any) => {
    return new Promise<void>((resolve) => {
      if (currentMode !== 'club' || treeNode.level !== 2) {
        resolve();
        return;
      }

      const nationId = String(treeNode.nationData?.id || treeNode.key.replace('nation_', ''));
      if (!nationId || nationCompsCache[nationId] !== undefined) {
        resolve();
        return;
      }

      fetchDomesticCompetitions(nationId, { size: 100 })
        .then((res: any) => {
          const list = Array.isArray(res) ? res : res?.content || [];
          const regularComps = list.filter(
            (c: any) => !c.is_virtual && !String(c.id).startsWith('oth-') && !String(c.id).startsWith('ext-')
          );
          setNationCompsCache((prev) => ({
            ...prev,
            [nationId]: regularComps,
          }));
          resolve();
        })
        .catch(() => {
          setNationCompsCache((prev) => ({
            ...prev,
            [nationId]: [],
          }));
          resolve();
        });
    });
  };

  // Xây dựng cây đơn vị
  const rawTreeData: DataNode[] = useMemo(() => {
    // ==========================================
    // 1. MÀN NATION: Cấp 1 duy nhất [ALL, AFC, CAF, CONCACAF, CONMEBOL, OFC, UEFA, EXTINCT]
    // ==========================================
    if (currentMode === 'nation') {
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

      const confedCodes = [...ORDERED_CONFED_CODES, 'EXTINCT'];
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

    // Nhóm quốc gia theo confederation
    const groups: Record<string, NationItem[]> = {};
    ORDERED_CONFED_CODES.forEach((code) => {
      groups[code] = [];
    });

    nations.forEach((n) => {
      let confedKey = '';
      if (typeof n.confed === 'string') {
        confedKey = n.confed.toUpperCase();
      } else if (n.confed && typeof n.confed === 'object') {
        confedKey = (n.confed.code || n.confed.name || '').toUpperCase();
      } else if (n.confed_id) {
        confedKey = String(n.confed_id).toUpperCase();
      }

      if (ORDERED_CONFED_CODES.includes(confedKey)) {
        groups[confedKey].push(n);
      }
    });

    const nodes: DataNode[] = [];

    // ==========================================
    // 2. MÀN COMP:
    // Cấp 1: [ALL, WORLD, AFC, CAF, CONCACAF, CONMEBOL, OFC, UEFA]
    // Cấp 2 (trừ ALL, WORLD): [International, ...[list nation theo châu lục]]
    // ==========================================
    if (currentMode === 'comp') {
      // Cấp 1: ALL
      if (showAllOption) {
        nodes.push({
          key: 'all',
          title: 'ALL',
          isLeaf: true,
          className: 'tree-node-level-1',
          level: 1,
        } as any);
      }

      // Cấp 1: WORLD (không có cấp 2)
      nodes.push({
        key: 'confed_WORLD',
        title: 'WORLD',
        isLeaf: true,
        className: 'tree-node-level-1',
        level: 1,
      } as any);

      // Cấp 1: AFC, CAF, CONCACAF, CONMEBOL, OFC, UEFA
      ORDERED_CONFED_CODES.forEach((confedKey) => {
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
          children: [
            // Cấp 2 mục 1: International (không có thẻ tag phía trước)
            {
              key: `intl_${confedKey}`,
              title: 'International',
              isLeaf: true,
              selectable: true,
              className: 'tree-node-level-2',
              level: 2,
              shortName: 'International',
              noTag: true,
              isInternational: true,
              confed: confedKey,
            },
            // Cấp 2 mục tiếp theo: Danh sách quốc gia theo châu lục
            ...sortedNations.map((n) => {
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
          ],
        } as any);
      });

      return nodes;
    }

    // ==========================================
    // 3. MÀN CLUB:
    // Cấp 1: [ALL, AFC, CAF, CONCACAF, CONMEBOL, OFC, UEFA]
    // Cấp 2 (trừ ALL): [list nation theo châu lục]
    // Cấp 3: [...[list comp có club theo nation], Other, Extinct]
    // ==========================================
    if (currentMode === 'club') {
      // Cấp 1: ALL
      if (showAllOption) {
        nodes.push({
          key: 'all',
          title: 'ALL',
          isLeaf: true,
          className: 'tree-node-level-1',
          level: 1,
        } as any);
      }

      ORDERED_CONFED_CODES.forEach((confedKey) => {
        const list = groups[confedKey] || [];
        const sortedNations = [...list].sort((a, b) => {
          const nameA = a.name_sh || a.name || a.name_lg || '';
          const nameB = b.name_sh || b.name || b.name_lg || '';
          return nameA.localeCompare(nameB);
        });

        nodes.push({
          key: `confed_${confedKey}`,
          title: confedKey,
          selectable: false,
          className: 'tree-node-level-1',
          level: 1,
          children: sortedNations.map((n) => {
            const nationId = String(n.id);
            const code = (n.name_3l || (n as any).code || (n as any).code3 || '---').toUpperCase();
            const shortName = n.name_sh || n.name || n.name_lg || '';

            // Cấp 3: Danh sách giải đấu nếu đã tải
            const cachedComps = nationCompsCache[nationId];
            let compChildren: DataNode[] | undefined = undefined;

            if (cachedComps !== undefined) {
              const compsWithClubs = cachedComps.filter((c: any) => {
                const clubCount = c.stats?.club ?? (c as any).clubs_count;
                return clubCount === undefined || clubCount > 0;
              });

              const sortedComps = [...compsWithClubs].sort((a, b) => {
                const nameA = a.name_sh || a.name || a.name_lg || '';
                const nameB = b.name_sh || b.name || b.name_lg || '';
                return nameA.localeCompare(nameB);
              });

              compChildren = [
                ...sortedComps.map((c) => ({
                  key: `comp_${c.id}`,
                  title: `${(c.name_3l || 'CMP').toUpperCase()} ${c.name_sh || c.name || c.name_lg || ''}`,
                  isLeaf: true,
                  selectable: true,
                  className: 'tree-node-level-3',
                  level: 3,
                  code3: (c.name_3l || 'CMP').toUpperCase(),
                  shortName: c.name_sh || c.name || c.name_lg || '',
                  compData: c,
                  nationId: nationId,
                } as any)),
                {
                  key: `oth_${nationId}`,
                  title: 'Other',
                  isLeaf: true,
                  selectable: true,
                  className: 'tree-node-level-3',
                  level: 3,
                  shortName: 'Other',
                  noTag: true,
                  nationId: nationId,
                  isOther: true,
                } as any,
                {
                  key: `ext_${nationId}`,
                  title: 'Extinct',
                  isLeaf: true,
                  selectable: true,
                  className: 'tree-node-level-3',
                  level: 3,
                  shortName: 'Extinct',
                  noTag: true,
                  nationId: nationId,
                  isExtinct: true,
                } as any,
              ];
            }

            return {
              key: `nation_${nationId}`,
              title: `${code} ${shortName}`,
              isLeaf: false, // Để có thể mở rộng cấp 3
              selectable: true,
              className: 'tree-node-level-2',
              level: 2,
              nationData: n,
              code3: code,
              shortName: shortName,
              children: compChildren,
            };
          }),
        } as any);
      });

      return nodes;
    }

    // ==========================================
    // 4. MÀN CITY, STADIUM (VÀ AWARD / DEFAULT):
    // Cấp 1: [ALL, AFC, CAF, CONCACAF, CONMEBOL, OFC, UEFA]
    // Cấp 2 (trừ ALL): [list nation theo châu lục]
    // ==========================================
    if (showAllOption) {
      nodes.push({
        key: 'all',
        title: 'ALL',
        isLeaf: true,
        className: 'tree-node-level-1',
        level: 1,
      } as any);
    }

    ORDERED_CONFED_CODES.forEach((confedKey) => {
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
  }, [currentMode, nations, showAllOption, allowSelectConfed, nationCompsCache]);

  // Lọc cây theo từ khóa tìm kiếm
  const filteredTreeData = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return rawTreeData;

    const filterNodes = (items: DataNode[]): DataNode[] => {
      const result: DataNode[] = [];
      for (const item of items) {
        const titleStr = String((item as any).title || '').toLowerCase();
        const codeStr = String((item as any).code3 || '').toLowerCase();
        const shortStr = String((item as any).shortName || '').toLowerCase();
        const matches = titleStr.includes(q) || codeStr.includes(q) || shortStr.includes(q);

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

    // Nếu click vào confed node mà không cho chọn confed: chỉ mở/đóng nhánh
    if (key.startsWith('confed_') && !allowSelectConfed) {
      setExpandedKeys((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      );
      return;
    }

    // Nếu ở màn club click vào nation: tự động mở rộng và tải Cấp 3
    if (currentMode === 'club' && key.startsWith('nation_')) {
      const nid = key.replace('nation_', '');
      if (nid && nationCompsCache[nid] === undefined) {
        fetchDomesticCompetitions(nid, { size: 100 })
          .then((res: any) => {
            const list = Array.isArray(res) ? res : res?.content || [];
            const regularComps = list.filter(
              (c: any) => !c.is_virtual && !String(c.id).startsWith('oth-') && !String(c.id).startsWith('ext-')
            );
            setNationCompsCache((prev) => ({
              ...prev,
              [nid]: regularComps,
            }));
          })
          .catch(() => {});
      }
      setExpandedKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    }

    onSelectNode(key, info.node);
  };

  return (
    <div className={`flex flex-col space-y-2.5 ${className}`}>
      {/* Ô tìm kiếm đơn vị chuẩn theo hình mẫu */}
      <Input.Search
        placeholder="Search"
        value={keyword}
        onChange={handleSearchChange}
        onSearch={(val) => setKeyword(val)}
        allowClear
        className="w-full"
      />

      {/* Khung hiển thị Cây đơn vị */}
      <div
        style={{ maxHeight: height }}
        className="overflow-y-auto mobile-frame-scroll border border-slate-200 rounded-lg p-1 bg-white"
      >
        <Tree
          blockNode
          showLine={{ showLeafIcon: false }}
          treeData={filteredTreeData}
          loadData={currentMode === 'club' ? handleLoadData : undefined}
          selectedKeys={selectedKey ? [selectedKey] : []}
          expandedKeys={expandedKeys}
          autoExpandParent={autoExpandParent}
          onExpand={(keys) => {
            setExpandedKeys(keys);
            setAutoExpandParent(false);
          }}
          onSelect={handleSelect}
          switcherIcon={(props: any) =>
            props.isLeaf ? null : props.expanded ? (
              <DownOutlined className="text-[10px] text-slate-500" />
            ) : (
              <RightOutlined className="text-[10px] text-slate-500" />
            )
          }
          titleRender={(node: any) => {
            const isSelected = Boolean(selectedKey && String(selectedKey) === String(node.key));
            const isLevel1 = node.level === 1;

            if (!isLevel1) {
              const code3 = node.code3 || node.nationData?.name_3l || '';
              const shortName = node.shortName || node.nationData?.name_sh || node.nationData?.name || '';
              const hideTag = Boolean(
                node.noTag ||
                node.isInternational ||
                node.isOther ||
                node.isExtinct ||
                String(node.key).startsWith('intl_') ||
                String(node.key).startsWith('oth_') ||
                String(node.key).startsWith('ext_')
              );

              return (
                <span className="flex items-center justify-between w-full min-w-0 pr-1 select-none text-xs">
                  <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
                    {!hideTag && code3 && (
                      <span
                        className={`inline-flex items-center justify-center px-1 py-0.5 rounded text-[10px] font-mono font-medium tracking-wider flex-shrink-0 border leading-none ${
                          isSelected
                            ? 'bg-blue-100 text-blue-700 border-blue-300'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {code3}
                      </span>
                    )}
                    <span className={`truncate ${isSelected ? 'font-medium text-blue-700' : ''}`}>
                      {shortName}
                    </span>
                  </span>
                  {isSelected && (
                    <CheckOutlined className="text-blue-600 text-xs shrink-0 ml-auto pl-2" />
                  )}
                </span>
              );
            }

            // Level 1: ALL, WORLD, AFC, CAF, CONCACAF, CONMEBOL, OFC, UEFA, EXTINCT
            return (
              <span className="flex items-center justify-between w-full min-w-0 pr-1 select-none text-xs font-semibold">
                <span className={`truncate ${isSelected ? 'text-blue-700' : ''}`}>{node.title}</span>
                {isSelected && (
                  <CheckOutlined className="text-blue-600 text-xs shrink-0 ml-auto pl-2" />
                )}
              </span>
            );
          }}
          className="unit-tree-directory text-xs"
        />
      </div>
    </div>
  );
}
