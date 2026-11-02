'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input, Modal, Button, App } from 'antd';
import { SearchOutlined, CheckOutlined, ReloadOutlined } from '@ant-design/icons';
import CardGrid from '../../components/CardGrid';
import { NationIcon } from '../../components/EntityIcons';
import ListPageFilterBar from '../../components/ListPageFilterBar';
import UnitTree from '../../components/UnitTree';
import { useApp } from '../../context/AppContext';
import { fetchNationsByContinent, NationItem } from '../../services/api';
import { EntityType } from '../../types';

interface ConfedOption {
  value: string;
  code: string;
  icon: string;
}

const CONFEDERATIONS: ConfedOption[] = [
  { value: 'all', code: 'ALL', icon: '🌍' },
  { value: 'UEFA', code: 'UEFA', icon: '🌍' },
  { value: 'AFC', code: 'AFC', icon: '🌏' },
  { value: 'CAF', code: 'CAF', icon: '🌍' },
  { value: 'CONCACAF', code: 'CONCACAF', icon: '🌎' },
  { value: 'CONMEBOL', code: 'CONMEBOL', icon: '🌎' },
  { value: 'OFC', code: 'OFC', icon: '🌏' },
  { value: 'EXTINCT', code: 'EXTINCT', icon: '🏛️' },
];

function ListNationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const { setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo, refreshSignal } = useApp();

  const initialConfed = searchParams.get('confedId') || 'UEFA';

  const [selectedConfed, setSelectedConfed] = useState<string>(initialConfed);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [tempConfed, setTempConfed] = useState<string>(initialConfed);

  const [keyword, setKeyword] = useState<string>('');
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>('');
  const [nations, setNations] = useState<NationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [total, setTotal] = useState<number>(0);

  const listContainerRef = useRef<HTMLDivElement>(null);

  // Sync confedId from searchParams
  useEffect(() => {
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
    setHeaderTitle('Nations');
    setHeaderId(undefined);
    setBreadcrumbs([{ title: 'Nations' }]);
    setBackHref(null);
    setHeaderLogo(null);
  }, [setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo]);

  // Scroll to top on confed or page change
  useEffect(() => {
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [selectedConfed, page]);

  const loadNations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchNationsByContinent(
        selectedConfed === 'all' ? null : selectedConfed,
        {
          page: page - 1,
          size: pageSize,
          keyword: debouncedKeyword,
        },
        refreshSignal > 0,
      );

      const items = Array.isArray(res) ? res : (res as any)?.content || [];
      const totalElements = (res as any)?.totalElements ?? (res as any)?.total ?? items.length;
      setNations(items);
      setTotal(totalElements);
    } catch (err: any) {
      message.error(err.message || 'Failed to load nations');
    } finally {
      setLoading(false);
    }
  }, [selectedConfed, page, pageSize, debouncedKeyword, refreshSignal, message]);

  useEffect(() => {
    loadNations();
  }, [loadNations]);

  const currentConfedObj = CONFEDERATIONS.find((c) => c.value === selectedConfed) || CONFEDERATIONS[1];
  const filterSummary = currentConfedObj.code;

  const handleOpenModal = () => {
    setTempConfed(selectedConfed);
    setModalOpen(true);
  };

  // Chọn option trong modal -> chỉ cập nhật giá trị tạm (temp)
  const handlePickConfed = (val: string) => {
    setTempConfed(val);
  };

  const handleResetModal = () => {
    setTempConfed('UEFA');
  };

  const handleApplyModal = () => {
    setSelectedConfed(tempConfed);
    setPage(1);
    setModalOpen(false);
  };

  return (
    <div className="h-full flex flex-col min-h-0 bg-white">
      {/* 1. Fixed Top Toolbar: Search + Filter Bar theo Wireframe */}
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
          pageIcon={<NationIcon size={20} />}
          iconBoxClassName="bg-blue-50 text-blue-600 border-blue-200/80"
          filterSummary={filterSummary}
          hasActiveCustomFilter={selectedConfed !== 'UEFA'}
          onClick={handleOpenModal}
        />
      </div>

      {/* 2. Danh sách cuộn mượt */}
      <div
        ref={listContainerRef}
        className="flex-1 min-h-0 overflow-y-auto mobile-frame-scroll px-3.5 py-3 pb-8"
      >
        <CardGrid
          items={nations}
          type={EntityType.NATION}
          loading={loading}
          columns={2}
          onNavigate={(record) => {
            if (record?.id) {
              router.push(`/nation/${record.id}`);
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
          emptyText="Không tìm thấy quốc gia nào phù hợp"
        />
      </div>

      {/* 3. Modal bộ lọc Cây đơn vị */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800 text-base font-bold pb-1">
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
              <NationIcon size={16} />
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
        width={460}
        centered
        destroyOnClose
      >
        <div className="py-1">
          <UnitTree
            mode="nation"
            confedOnly
            selectedKey={tempConfed}
            onSelectNode={(val) => handlePickConfed(val)}
            allOptionLabel="Tất cả Liên đoàn (All)"
          />
        </div>
      </Modal>
    </div>
  );
}

export default function ListNationsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading nations...</div>}>
      <ListNationsContent />
    </Suspense>
  );
}
