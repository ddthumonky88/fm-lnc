'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input, Modal, Button, App } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import CardGrid from '../../components/CardGrid';
import { CompIcon } from '../../components/EntityIcons';
import ListPageFilterBar from '../../components/ListPageFilterBar';
import UnitTree from '../../components/UnitTree';
import { useApp } from '../../context/AppContext';
import { fetchCompetitionsList, fetchUnitTree, findNationInTree, CompetitionItem, UnitTreeNode } from '../../services/api';
import { EntityType } from '../../types';

const CONFEDERATIONS = [
  { label: '🌍 Tất cả Châu lục / Toàn cầu', value: 'all' },
  { label: '🇪🇺 UEFA (Châu Âu)', value: 'UEFA' },
  { label: '🌏 AFC (Châu Á)', value: 'AFC' },
  { label: '🌍 CAF (Châu Phi)', value: 'CAF' },
  { label: '🌎 CONCACAF (Bắc, Trung Mỹ & Caribe)', value: 'CONCACAF' },
  { label: '🌎 CONMEBOL (Nam Mỹ)', value: 'CONMEBOL' },
  { label: '🌏 OFC (Châu Đại Dương)', value: 'OFC' },
  { label: '🌐 WORLD (Quốc tế)', value: 'WORLD' },
];

function ListCompsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const { setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo, refreshSignal } = useApp();

  const initialNationId = searchParams.get('nationId') || 'all';
  const initialScope = searchParams.get('scope') || 'all';
  const initialConfed = searchParams.get('confedId') || 'all';

  const [scope, setScope] = useState<'all' | 'domestic' | 'international'>(initialScope as any);
  const [selectedConfed, setSelectedConfed] = useState<string>(initialConfed);
  const [selectedNation, setSelectedNation] = useState<string>(initialNationId);

  // Modal temporary state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [tempScope, setTempScope] = useState<'all' | 'domestic' | 'international'>(initialScope as any);
  const [tempConfed, setTempConfed] = useState<string>(initialConfed);
  const [tempNation, setTempNation] = useState<string>(initialNationId);

  const [treeNodes, setTreeNodes] = useState<UnitTreeNode[]>([]);
  const [keyword, setKeyword] = useState<string>('');
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>('');
  const [competitions, setCompetitions] = useState<CompetitionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(24);
  const [total, setTotal] = useState<number>(0);

  const listContainerRef = useRef<HTMLDivElement>(null);

  // Load cấu trúc cây đơn vị
  useEffect(() => {
    fetchUnitTree('comp')
      .then((nodes) => {
        if (Array.isArray(nodes)) {
          setTreeNodes(nodes);
        }
      })
      .catch(() => {});
  }, []);

  // Sync query params if they change
  useEffect(() => {
    const qNation = searchParams.get('nationId');
    if (qNation) {
      setSelectedNation(qNation);
      setTempNation(qNation);
    }
    const qScope = searchParams.get('scope');
    if (qScope) {
      setScope(qScope as any);
      setTempScope(qScope as any);
    }
    const qConfed = searchParams.get('confedId');
    if (qConfed) {
      setSelectedConfed(qConfed);
      setTempConfed(qConfed);
    }
  }, [searchParams]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  // Set AppHeader
  useEffect(() => {
    setHeaderTitle('Competitions');
    setHeaderId(undefined);
    setBreadcrumbs([{ title: 'Competitions' }]);
    setBackHref(null);
    setHeaderLogo(null);
  }, [setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo]);

  // Scroll to top on filter/page change
  useEffect(() => {
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [scope, selectedConfed, selectedNation, page]);

  const loadCompetitions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCompetitionsList(
        {
          scope,
          confedId: selectedConfed === 'all' ? undefined : selectedConfed,
          nationId: selectedNation === 'all' ? undefined : selectedNation,
          page: page - 1,
          size: pageSize,
          keyword: debouncedKeyword,
        },
        refreshSignal > 0,
      );

      const rawItems = Array.isArray(res) ? res : (res as any)?.content || [];
      const items = rawItems.filter((c: any) => {
        const id = String(c.id || '').toUpperCase();
        const type = String(c.virtual_type || c.type || '').toUpperCase();
        return (
          !id.startsWith('OTH-') &&
          !id.startsWith('EXT-') &&
          id !== '[OTHER]' &&
          id !== '[EXTINCT]' &&
          type !== 'OTHER' &&
          type !== 'EXTINCT'
        );
      });
      const totalElements = (res as any)?.totalElements ?? (res as any)?.total ?? items.length;
      setCompetitions(items);
      setTotal(totalElements);
    } catch (err: any) {
      message.error(err.message || 'Failed to load competitions');
    } finally {
      setLoading(false);
    }
  }, [scope, selectedConfed, selectedNation, page, pageSize, debouncedKeyword, refreshSignal, message]);

  useEffect(() => {
    loadCompetitions();
  }, [loadCompetitions]);

  // Filter summary: cấp 1 > cấp 2
  const levels: string[] = [];
  if (selectedConfed === 'WORLD') {
    levels.push('WORLD');
  } else if (scope === 'international') {
    if (selectedConfed !== 'all') {
      levels.push(selectedConfed);
    }
    levels.push('International');
  } else if (selectedNation !== 'all') {
    const nationNode = findNationInTree(treeNodes, selectedNation);
    let confed = selectedConfed !== 'all' ? selectedConfed : (nationNode?.confed || '');
    if (confed) levels.push(confed);
    const nationName = nationNode?.shortName || nationNode?.title || selectedNation;
    levels.push(nationName);
  } else if (selectedConfed !== 'all') {
    levels.push(selectedConfed);
  }

  const filterSummary = levels.length > 0 ? levels.join(' > ') : 'Tất cả giải đấu';
  const hasActiveCustomFilter = scope !== 'all' || selectedConfed !== 'all' || selectedNation !== 'all';

  const handleOpenModal = () => {
    setTempScope(scope);
    setTempConfed(selectedConfed);
    setTempNation(selectedNation);
    setModalOpen(true);
  };

  const handleSelectTreeNode = (key: string, nodeData?: any) => {
    if (key === 'all') {
      setTempScope('all');
      setTempConfed('all');
      setTempNation('all');
    } else if (key === 'confed_WORLD') {
      setTempScope('international');
      setTempConfed('WORLD');
      setTempNation('all');
    } else if (key.startsWith('intl_')) {
      const confedCode = key.replace('intl_', '');
      setTempScope('international');
      setTempConfed(confedCode);
      setTempNation('all');
    } else if (key.startsWith('confed_')) {
      const confedCode = key.replace('confed_', '');
      setTempScope('all');
      setTempConfed(confedCode);
      setTempNation('all');
    } else {
      let confedCode = nodeData?.confed || 'all';
      if (confedCode === 'all' && nodeData?.nationData) {
        const nation = nodeData.nationData;
        if (typeof nation.confed === 'string') confedCode = nation.confed.toUpperCase();
        else if (nation.confed?.code) confedCode = nation.confed.code.toUpperCase();
      }
      if (confedCode === 'all') {
        const nationNode = findNationInTree(treeNodes, key);
        if (nationNode?.confed) confedCode = nationNode.confed.toUpperCase();
      }
      setTempScope('domestic');
      setTempConfed(confedCode);
      setTempNation(key);
    }
  };

  const handleResetModal = () => {
    setTempScope('all');
    setTempConfed('all');
    setTempNation('all');
  };

  const handleApplyModal = () => {
    setScope(tempScope);
    setSelectedConfed(tempConfed);
    setSelectedNation(tempNation);
    setPage(1);
    setModalOpen(false);
  };

  return (
    <div className="h-full flex flex-col min-h-0 bg-white">
      {/* 1. Fixed Top Toolbar */}
      <div className="shrink-0 flex-none px-3.5 pt-3 pb-2.5 border-b border-slate-100 bg-white space-y-2.5">
        {/* Layer 1: Thanh Search trên cùng (không bọc trong khung) */}
        <Input
          size="large"
          placeholder="Search..."
          allowClear
          prefix={<SearchOutlined className="text-slate-400 text-lg mr-2" />}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-full text-sm sm:text-base bg-slate-50/80 hover:bg-white focus:bg-white rounded-xl border border-slate-200 hover:border-blue-400 focus:border-blue-500 py-2 px-3 shadow-2xs transition-colors"
        />

        {/* Layer 2: [Icon đại diện page] [Thanh select filter] */}
        <ListPageFilterBar
          pageIcon={<CompIcon size={20} />}
          iconBoxClassName="bg-amber-50 text-amber-600 border-amber-200/80"
          filterSummary={filterSummary}
          hasActiveCustomFilter={hasActiveCustomFilter}
          onClick={handleOpenModal}
        />
      </div>

      {/* 2. Danh sách cuộn mượt */}
      <div
        ref={listContainerRef}
        className="flex-1 min-h-0 overflow-y-auto mobile-frame-scroll px-3.5 py-3 pb-8"
      >
        <CardGrid
          items={competitions}
          type={EntityType.COMPETITION}
          loading={loading}
          cardSize="large"
          onNavigate={(record) => {
            if (record?.id) {
              router.push(`/comp/${record.id}`);
            }
          }}
          serverPagination={{
            current: page,
            pageSize,
            total,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          emptyText="Không tìm thấy giải đấu nào phù hợp"
        />
      </div>

      {/* 3. Modal bộ lọc Giải đấu */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800 text-base font-bold pb-1">
            <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <CompIcon size={16} />
            </span>
            <span>Bộ lọc Giải đấu</span>
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="reset" icon={<ReloadOutlined />} onClick={handleResetModal}>
            Đặt lại
          </Button>,
          <Button key="close" onClick={() => setModalOpen(false)}>
            Đóng
          </Button>,
          <Button key="apply" type="primary" onClick={handleApplyModal}>
            Áp dụng
          </Button>,
        ]}
        width={480}
        centered
        destroyOnHidden
      >
        <div className="py-1">
          <UnitTree
            mode="comp"
            allowSelectConfed={true}
            selectedKey={
              tempNation !== 'all'
                ? tempNation
                : tempConfed === 'WORLD'
                ? 'confed_WORLD'
                : tempScope === 'international' && tempConfed !== 'all'
                ? `intl_${tempConfed}`
                : tempConfed !== 'all'
                ? `confed_${tempConfed}`
                : 'all'
            }
            onSelectNode={handleSelectTreeNode}
          />
        </div>
      </Modal>
    </div>
  );
}

export default function ListCompsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading competitions...</div>}>
      <ListCompsContent />
    </Suspense>
  );
}
