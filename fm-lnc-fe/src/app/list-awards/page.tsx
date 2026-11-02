'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input, Modal, Button, Tag, App } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import CardGrid from '../../components/CardGrid';
import { AwardIcon } from '../../components/EntityIcons';
import ListPageFilterBar from '../../components/ListPageFilterBar';
import UnitTree from '../../components/UnitTree';
import { useApp } from '../../context/AppContext';
import { fetchAwards, fetchAwardsInComp, fetchUnitTree, findNationInTree, AwardItem, UnitTreeNode } from '../../services/api';
import { EntityType } from '../../types';

function ListAwardsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const { setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo, refreshSignal } = useApp();

  const initialNationId = searchParams.get('nationId') || 'all';
  const initialCompId = searchParams.get('compId') || undefined;

  const [selectedNation, setSelectedNation] = useState<string>(initialNationId);
  const [selectedCompId, setSelectedCompId] = useState<string | undefined>(initialCompId);

  // Modal temporary state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [tempNation, setTempNation] = useState<string>(initialNationId);
  const [tempCompId, setTempCompId] = useState<string | undefined>(initialCompId);

  const [treeNodes, setTreeNodes] = useState<UnitTreeNode[]>([]);
  const [keyword, setKeyword] = useState<string>('');
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>('');
  const [awards, setAwards] = useState<AwardItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(24);
  const [total, setTotal] = useState<number>(0);

  const listContainerRef = useRef<HTMLDivElement>(null);

  // Load cấu trúc cây đơn vị
  useEffect(() => {
    fetchUnitTree('award')
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
    setHeaderTitle('Awards');
    setHeaderId(undefined);
    setBreadcrumbs([{ title: 'Awards' }]);
    setBackHref(null);
    setHeaderLogo(null);
  }, [setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo]);

  // Scroll to top on filter/page change
  useEffect(() => {
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [selectedNation, selectedCompId, page]);

  const loadAwards = useCallback(async () => {
    setLoading(true);
    try {
      let res: any;
      if (selectedCompId) {
        res = await fetchAwardsInComp(
          selectedCompId,
          {
            page: page - 1,
            size: pageSize,
            keyword: debouncedKeyword,
          },
          refreshSignal > 0,
        );
      } else {
        res = await fetchAwards(
          selectedNation === 'all' ? 'all' : selectedNation,
          {
            page: page - 1,
            size: pageSize,
            keyword: debouncedKeyword,
          },
          refreshSignal > 0,
        );
      }

      const items = Array.isArray(res) ? res : (res as any)?.content || [];
      const totalElements = (res as any)?.totalElements ?? (res as any)?.total ?? items.length;
      setAwards(items);
      setTotal(totalElements);
    } catch (err: any) {
      message.error(err.message || 'Failed to load awards');
    } finally {
      setLoading(false);
    }
  }, [selectedNation, selectedCompId, page, pageSize, debouncedKeyword, refreshSignal, message]);

  useEffect(() => {
    loadAwards();
  }, [loadAwards]);

  // Filter summary:
  // - Nếu chỉ chọn quốc gia: {confed} > {nation_short_name}
  // - Nếu có chọn giải đấu: {confed} > {nation_3letter} > {comp_name}
  const levels: string[] = [];
  if (selectedNation !== 'all') {
    const nationNode = findNationInTree(treeNodes, selectedNation);
    if (nationNode?.confed) levels.push(nationNode.confed);

    if (selectedCompId) {
      const nation3l = nationNode?.code3 || selectedNation;
      levels.push(nation3l);
      levels.push(`Comp: ${selectedCompId}`);
    } else {
      const nationName = nationNode?.shortName || nationNode?.title || selectedNation;
      levels.push(nationName);
    }
  } else if (selectedCompId) {
    levels.push(`Comp: ${selectedCompId}`);
  }

  const filterSummary = levels.length > 0 ? levels.join(' > ') : 'Tất cả giải thưởng';
  const hasActiveCustomFilter = selectedNation !== 'all' || !!selectedCompId;

  const handleOpenModal = () => {
    setTempNation(selectedNation);
    setTempCompId(selectedCompId);
    setModalOpen(true);
  };

  // Chọn option trong modal -> chỉ cập nhật giá trị tạm (temp)
  const handlePickNation = (val: string) => {
    setTempNation(val);
    setTempCompId(undefined);
  };

  const handleClearComp = () => {
    setTempCompId(undefined);
  };

  const handleResetModal = () => {
    setTempCompId(undefined);
    setTempNation('all');
  };

  const handleApplyModal = () => {
    setSelectedNation(tempNation);
    setSelectedCompId(tempCompId);
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
          pageIcon={<AwardIcon size={20} />}
          iconBoxClassName="bg-rose-50 text-rose-600 border-rose-200/80"
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
          items={awards}
          type={EntityType.AWARD}
          loading={loading}
          columns={2}
          onNavigate={(record) => {
            if (record?.id) {
              router.push(`/award/${record.id}`);
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
          emptyText="Không tìm thấy giải thưởng nào phù hợp"
        />
      </div>

      {/* 3. Modal bộ lọc Cây đơn vị */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800 text-base font-bold pb-1">
            <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <AwardIcon size={16} />
            </span>
            <span>Cây đơn vị</span>
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
        <div className="py-2 space-y-3">
          {/* Filter theo Comp nếu có */}
          {tempCompId && (
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Giải đấu được gán:
              </label>
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                <Tag
                  closable
                  color="magenta"
                  onClose={handleClearComp}
                  className="font-medium"
                >
                  Comp ID: {tempCompId}
                </Tag>
                <span className="text-xs text-slate-500">
                  Nhấn dấu × để chuyển sang lọc theo quốc gia
                </span>
              </div>
            </div>
          )}

          {/* Cây đơn vị */}
          <div>
            <UnitTree
              mode="award"
              selectedKey={tempNation}
              onSelectNode={(val) => handlePickNation(val)}
              allOptionLabel="Tất cả quốc gia (All Nations)"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function ListAwardsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading awards...</div>}>
      <ListAwardsContent />
    </Suspense>
  );
}
