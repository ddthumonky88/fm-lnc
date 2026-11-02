'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input, Modal, Button, Segmented, Tag, App } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import CardGrid from '../../components/CardGrid';
import { ClubIcon } from '../../components/EntityIcons';
import ListPageFilterBar from '../../components/ListPageFilterBar';
import { getNationDisplayName } from '../../components/NationTreeSelect';
import UnitTree from '../../components/UnitTree';
import { useApp } from '../../context/AppContext';
import { searchClubs, fetchAllNations, ClubItem, NationItem } from '../../services/api';
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
  const [extinctFilter, setExtinctFilter] = useState<string>('all');

  // Modal temporary state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [tempNation, setTempNation] = useState<string>(initialNationId);
  const [tempExtinct, setTempExtinct] = useState<string>('all');
  const [tempCompId, setTempCompId] = useState<string | undefined>(initialCompId);

  const [nationsList, setNationsList] = useState<NationItem[]>([]);
  const [keyword, setKeyword] = useState<string>('');
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>('');
  const [clubs, setClubs] = useState<ClubItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(24);
  const [total, setTotal] = useState<number>(0);

  const listContainerRef = useRef<HTMLDivElement>(null);

  // Load nation options
  useEffect(() => {
    fetchAllNations({ size: 300 })
      .then((res: any) => {
        const list = Array.isArray(res) ? res : res.content || [];
        setNationsList(list);
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

  // Filter summary: cấp 1 > cấp 2 > cấp 3
  const levels: string[] = [];
  if (selectedNation !== 'all') {
    const nation = nationsList.find((n) => String(n.id) === String(selectedNation));
    let confed = '';
    if (nation) {
      if (typeof nation.confed === 'string') confed = nation.confed.toUpperCase();
      else if (nation.confed?.code) confed = nation.confed.code.toUpperCase();
      else if (nation.confed_id) confed = String(nation.confed_id).toUpperCase();
    }
    // Cấp 1
    if (confed) levels.push(confed);

    // Cấp 2
    levels.push(getNationDisplayName(nationsList, selectedNation));

    // Cấp 3
    if (selectedCompId) {
      if (selectedCompId.startsWith('oth-')) {
        levels.push('Other');
      } else if (selectedCompId.startsWith('ext-')) {
        levels.push('Extinct');
      } else {
        levels.push(`Comp: ${selectedCompId}`);
      }
    } else {
      if (extinctFilter === 'active') {
        levels.push('Hoạt động');
      } else if (extinctFilter === 'extinct') {
        levels.push('Giải thể');
      }
    }
  } else {
    if (extinctFilter === 'active') {
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
    setModalOpen(true);
  };

  // Đổi option -> áp dụng ngay và về trang 1 (modal giữ mở để chỉnh tiếp)
  const handleSelectTreeNode = (key: string, nodeData?: any) => {
    if (key === 'all') {
      setTempNation('all');
      setSelectedNation('all');
      setTempCompId(undefined);
      setSelectedCompId(undefined);
      setTempExtinct('all');
      setExtinctFilter('all');
    } else if (key.startsWith('nation_')) {
      const nid = key.replace('nation_', '');
      setTempNation(nid);
      setSelectedNation(nid);
      setTempCompId(undefined);
      setSelectedCompId(undefined);
    } else if (key.startsWith('comp_')) {
      const compId = key.replace('comp_', '');
      const nid = nodeData?.nationId || nodeData?.compData?.nation_id;
      if (nid) {
        setTempNation(nid);
        setSelectedNation(nid);
      }
      setTempCompId(compId);
      setSelectedCompId(compId);
    } else if (key.startsWith('oth_')) {
      const nid = key.replace('oth_', '');
      setTempNation(nid);
      setSelectedNation(nid);
      setTempCompId('oth-' + nid);
      setSelectedCompId('oth-' + nid);
      setTempExtinct('active');
      setExtinctFilter('active');
    } else if (key.startsWith('ext_')) {
      const nid = key.replace('ext_', '');
      setTempNation(nid);
      setSelectedNation(nid);
      setTempCompId('ext-' + nid);
      setSelectedCompId('ext-' + nid);
      setTempExtinct('extinct');
      setExtinctFilter('extinct');
    }
    setPage(1);
  };

  const handlePickExtinct = (val: string) => {
    setTempExtinct(val);
    setExtinctFilter(val);
    setPage(1);
  };

  const handleClearComp = () => {
    setTempCompId(undefined);
    setSelectedCompId(undefined);
    setPage(1);
  };

  const handleResetModal = () => {
    setTempNation('all');
    setSelectedNation('all');
    setTempExtinct('all');
    setExtinctFilter('all');
    setTempCompId(undefined);
    setSelectedCompId(undefined);
    setPage(1);
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
          <Button key="close" type="primary" onClick={() => setModalOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={460}
        centered
        destroyOnClose
      >
        <div className="py-2 space-y-4">
          {/* Cây đơn vị */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Cây đơn vị:
            </label>
            <UnitTree
              mode="club"
              nations={nationsList}
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
              height={280}
            />
          </div>

          {/* Tình trạng CLB */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Tình trạng hoạt động:
            </label>
            <Segmented
              value={tempExtinct}
              onChange={(val) => handlePickExtinct(val as string)}
              options={[
                { label: 'Tất cả', value: 'all' },
                { label: '🟢 Hoạt động', value: 'active' },
                { label: '⚪ Giải thể', value: 'extinct' },
              ]}
              block
              size="middle"
            />
          </div>

          {/* Filter theo Comp nếu có */}
          {tempCompId && (
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Giải đấu được gán:
              </label>
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                <Tag
                  closable
                  color="blue"
                  onClose={handleClearComp}
                  className="font-medium"
                >
                  Comp ID: {tempCompId}
                </Tag>
                <span className="text-xs text-slate-500">
                  Nhấn dấu × để hủy lọc theo giải đấu
                </span>
              </div>
            </div>
          )}
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
