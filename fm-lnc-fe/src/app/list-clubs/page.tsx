'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input, Modal, Button, Tag, App } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import CardGrid from '../../components/CardGrid';
import { ClubIcon } from '../../components/EntityIcons';
import ListPageFilterBar from '../../components/ListPageFilterBar';
import UnitTree from '../../components/UnitTree';
import { useApp } from '../../context/AppContext';
import { searchClubs, fetchUnitTree, findNationInTree, fetchCompetitionInfo, ClubItem, UnitTreeNode } from '../../services/api';
import { EntityType } from '../../types';

function ListClubsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const { setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo, refreshSignal } = useApp();

  const initialNationId = searchParams.get('nationId') || 'all';
  const initialCompId = searchParams.get('compId') || undefined;

  const [selectedNation, setSelectedNation] = useState<string>(initialNationId);
  const [selectedCompId, setSelectedCompId] = useState<string | undefined>(initialCompId);
  const [selectedCompName, setSelectedCompName] = useState<string>('');
  const [extinctFilter, setExtinctFilter] = useState<string>('all');

  // Modal temporary state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [tempNation, setTempNation] = useState<string>(initialNationId);
  const [tempExtinct, setTempExtinct] = useState<string>('all');
  const [tempCompId, setTempCompId] = useState<string | undefined>(initialCompId);
  const [tempCompName, setTempCompName] = useState<string>('');

  const [treeNodes, setTreeNodes] = useState<UnitTreeNode[]>([]);
  const [keyword, setKeyword] = useState<string>('');
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>('');
  const [clubs, setClubs] = useState<ClubItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(24);
  const [total, setTotal] = useState<number>(0);

  const listContainerRef = useRef<HTMLDivElement>(null);

  // Load cấu trúc cây đơn vị
  useEffect(() => {
    fetchUnitTree('club')
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
    const qComp = searchParams.get('compId');
    if (qComp) {
      setSelectedCompId(qComp);
      setTempCompId(qComp);
    }
  }, [searchParams]);

  // Load comp name if initial compId is present
  useEffect(() => {
    if (selectedCompId && !selectedCompName) {
      if (selectedCompId.startsWith('oth-')) {
        setSelectedCompName('Other');
        setTempCompName('Other');
      } else if (selectedCompId.startsWith('ext-')) {
        setSelectedCompName('Extinct');
        setTempCompName('Extinct');
      } else {
        fetchCompetitionInfo(selectedCompId)
          .then((comp) => {
            if (comp) {
              const name = comp.name_sh || comp.name || comp.name_lg || '';
              setSelectedCompName(name);
              setTempCompName(name);
              if (comp.nation_id && selectedNation === 'all') {
                setSelectedNation(String(comp.nation_id));
                setTempNation(String(comp.nation_id));
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [selectedCompId, selectedCompName, selectedNation]);

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
    setHeaderTitle('Clubs');
    setHeaderId(undefined);
    setBreadcrumbs([{ title: 'Clubs' }]);
    setBackHref(null);
    setHeaderLogo(null);
  }, [setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo]);

  // Scroll to top on filter/page change
  useEffect(() => {
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [selectedNation, selectedCompId, extinctFilter, page]);

  const loadClubs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchClubs(
        {
          nationId: selectedNation === 'all' ? undefined : selectedNation,
          compId: selectedCompId,
          extinct: extinctFilter === 'all' ? undefined : extinctFilter === 'extinct',
          page: page - 1,
          size: pageSize,
          keyword: debouncedKeyword,
        },
        refreshSignal > 0,
      );

      const items = Array.isArray(res) ? res : (res as any)?.content || [];
      const totalElements = (res as any)?.totalElements ?? (res as any)?.total ?? items.length;
      setClubs(items);
      setTotal(totalElements);
    } catch (err: any) {
      message.error(err.message || 'Failed to load clubs');
    } finally {
      setLoading(false);
    }
  }, [selectedNation, selectedCompId, extinctFilter, page, pageSize, debouncedKeyword, refreshSignal, message]);

  useEffect(() => {
    loadClubs();
  }, [loadClubs]);

  // Filter summary:
  // - Nếu chỉ chọn quốc gia: {confed} > {nation_short_name}
  // - Nếu có chọn giải đấu: {confed} > {nation_3letter} > {comp_name}
  const levels: string[] = [];
  if (selectedNation !== 'all') {
    const nationNode = findNationInTree(treeNodes, selectedNation);
    if (nationNode?.confed) levels.push(nationNode.confed);

    if (selectedCompId) {
      // Có giải đấu: dùng {nation_3letter} và {comp_name}
      const nation3l = nationNode?.code3 || selectedNation;
      levels.push(nation3l);

      let compName = selectedCompName;
      if (selectedCompId.startsWith('oth-')) compName = 'Other';
      else if (selectedCompId.startsWith('ext-')) compName = 'Extinct';
      else if (!compName) compName = `Comp: ${selectedCompId}`;
      levels.push(compName);
    } else {
      // Chỉ có quốc gia: dùng {nation_short_name}
      const nationName = nationNode?.shortName || nationNode?.title || selectedNation;
      levels.push(nationName);

      if (extinctFilter === 'active') {
        levels.push('Hoạt động');
      } else if (extinctFilter === 'extinct') {
        levels.push('Giải thể');
      }
    }
  } else {
    if (selectedCompId) {
      let compName = selectedCompName;
      if (selectedCompId.startsWith('oth-')) compName = 'Other';
      else if (selectedCompId.startsWith('ext-')) compName = 'Extinct';
      else if (!compName) compName = `Comp: ${selectedCompId}`;
      levels.push(compName);
    } else if (extinctFilter === 'active') {
      levels.push('Hoạt động');
    } else if (extinctFilter === 'extinct') {
      levels.push('Giải thể');
    }
  }

  const filterSummary = levels.length > 0 ? levels.join(' > ') : 'Tất cả câu lạc bộ';
  const hasActiveCustomFilter = selectedNation !== 'all' || extinctFilter !== 'all' || !!selectedCompId;

  const handleOpenModal = () => {
    setTempNation(selectedNation);
    setTempExtinct(extinctFilter);
    setTempCompId(selectedCompId);
    setTempCompName(selectedCompName);
    setModalOpen(true);
  };

  // Đổi option trên cây trong modal -> chỉ cập nhật giá trị tạm (temp)
  const handleSelectTreeNode = (key: string, nodeData?: any) => {
    if (key === 'all') {
      setTempNation('all');
      setTempCompId(undefined);
      setTempCompName('');
      setTempExtinct('all');
    } else if (key.startsWith('nation_')) {
      const nid = key.replace('nation_', '');
      setTempNation(nid);
      setTempCompId(undefined);
      setTempCompName('');
    } else if (key.startsWith('comp_')) {
      const compId = key.replace('comp_', '');
      const nid = nodeData?.nationId || nodeData?.compData?.nation_id;
      if (nid) {
        setTempNation(nid);
      }
      setTempCompId(compId);
      const cName = nodeData?.shortName || nodeData?.compData?.name_sh || nodeData?.compData?.name || '';
      setTempCompName(cName);
    } else if (key.startsWith('oth_')) {
      const nid = key.replace('oth_', '');
      setTempNation(nid);
      setTempCompId('oth-' + nid);
      setTempExtinct('active');
      setTempCompName('Other');
    } else if (key.startsWith('ext_')) {
      const nid = key.replace('ext_', '');
      setTempNation(nid);
      setTempCompId('ext-' + nid);
      setTempExtinct('extinct');
      setTempCompName('Extinct');
    }
  };

  const handleClearComp = () => {
    setTempCompId(undefined);
    setTempCompName('');
    setSelectedCompId(undefined);
    setSelectedCompName('');
    setPage(1);
  };

  const handleResetModal = () => {
    setTempNation('all');
    setTempExtinct('all');
    setTempCompId(undefined);
    setTempCompName('');
  };

  const handleApplyModal = () => {
    setSelectedNation(tempNation);
    setSelectedCompId(tempCompId);
    setSelectedCompName(tempCompName);
    setExtinctFilter(tempExtinct);
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
          pageIcon={<ClubIcon size={20} />}
          iconBoxClassName="bg-indigo-50 text-indigo-600 border-indigo-200/80"
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
          items={clubs}
          type={EntityType.CLUB}
          loading={loading}
          cardSize="large"
          onNavigate={(record) => {
            if (record?.id) {
              router.push(`/club/${record.id}`);
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
          emptyText="Không tìm thấy câu lạc bộ nào phù hợp"
        />
      </div>

      {/* 3. Modal bộ lọc Câu lạc bộ */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800 text-base font-bold pb-1">
            <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
              <ClubIcon size={16} />
            </span>
            <span>Bộ lọc Câu lạc bộ</span>
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
            mode="club"
            selectedKey={
              tempCompId
                ? tempCompId.startsWith('oth-')
                  ? `oth_${tempCompId.slice(4)}`
                  : tempCompId.startsWith('ext-')
                  ? `ext_${tempCompId.slice(4)}`
                  : `comp_${tempCompId}`
                : tempNation !== 'all'
                ? `nation_${tempNation}`
                : 'all'
            }
            onSelectNode={handleSelectTreeNode}
          />
        </div>
      </Modal>
    </div>
  );
}

export default function ListClubsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading clubs...</div>}>
      <ListClubsContent />
    </Suspense>
  );
}
