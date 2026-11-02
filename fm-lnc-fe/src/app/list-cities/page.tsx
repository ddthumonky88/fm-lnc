'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input, Modal, Button, App } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import CardGrid from '../../components/CardGrid';
import { CityIcon } from '../../components/EntityIcons';
import ListPageFilterBar from '../../components/ListPageFilterBar';
import { getNationDisplayName } from '../../components/NationTreeSelect';
import UnitTree from '../../components/UnitTree';
import { useApp } from '../../context/AppContext';
import { fetchCities, fetchAllNations, CityItem, NationItem } from '../../services/api';
import { EntityType } from '../../types';

function ListCitiesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const { setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo, refreshSignal } = useApp();

  const initialNationId = searchParams.get('nationId') || 'all';

  const [selectedNation, setSelectedNation] = useState<string>(initialNationId);

  // Modal temporary state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [tempNation, setTempNation] = useState<string>(initialNationId);

  const [nationsList, setNationsList] = useState<NationItem[]>([]);
  const [keyword, setKeyword] = useState<string>('');
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>('');

  const [cities, setCities] = useState<CityItem[]>([]);
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

  // Sync if query param changes
  useEffect(() => {
    const qNation = searchParams.get('nationId');
    if (qNation) {
      setSelectedNation(qNation);
      setTempNation(qNation);
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
    setHeaderTitle('Cities');
    setHeaderId(undefined);
    setBreadcrumbs([{ title: 'Cities' }]);
    setBackHref(null);
    setHeaderLogo(null);
  }, [setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo]);

  // Scroll to top on filter/page change
  useEffect(() => {
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [selectedNation, page]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const natParam = selectedNation === 'all' ? 'all' : selectedNation;
      const res = await fetchCities(
        natParam,
        {
          page: page - 1,
          size: pageSize,
          keyword: debouncedKeyword,
        },
        refreshSignal > 0,
      );
      const items = Array.isArray(res) ? res : (res as any)?.content || [];
      const totalElements = (res as any)?.totalElements ?? (res as any)?.total ?? items.length;
      setCities(items);
      setTotal(totalElements);
    } catch (err: any) {
      message.error(err.message || 'Failed to load cities');
    } finally {
      setLoading(false);
    }
  }, [selectedNation, page, pageSize, debouncedKeyword, refreshSignal, message]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  let filterSummary = 'Tất cả quốc gia';
  if (selectedNation !== 'all') {
    const nation = nationsList.find((n) => String(n.id) === String(selectedNation));
    let confed = '';
    if (nation) {
      if (typeof nation.confed === 'string') confed = nation.confed.toUpperCase();
      else if (nation.confed?.code) confed = nation.confed.code.toUpperCase();
      else if (nation.confed_id) confed = String(nation.confed_id).toUpperCase();
    }
    const nation3l = (nation?.name_3l || (nation as any)?.code || nation?.name_sh || nation?.name || '').toUpperCase();
    const nationDisplay = nation3l || getNationDisplayName(nationsList, selectedNation);
    filterSummary = confed ? `${confed} > ${nationDisplay}` : nationDisplay;
  }

  const hasActiveCustomFilter = selectedNation !== 'all';

  const handleOpenModal = () => {
    setTempNation(selectedNation);
    setModalOpen(true);
  };

  // Chọn option trong modal -> chỉ cập nhật giá trị tạm (temp)
  const handlePickNation = (val: string) => {
    setTempNation(val);
  };

  const handleResetModal = () => {
    setTempNation('all');
  };

  const handleApplyModal = () => {
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
          pageIcon={<CityIcon size={20} />}
          iconBoxClassName="bg-emerald-50 text-emerald-600 border-emerald-200/80"
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
          items={cities}
          type={EntityType.CITY}
          loading={loading}
          columns={2}
          onNavigate={(record) => {
            if (record?.id) {
              router.push(`/city/${record.id}`);
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
          emptyText="Không tìm thấy thành phố nào phù hợp"
        />
      </div>

      {/* 3. Modal bộ lọc Cây đơn vị */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800 text-base font-bold pb-1">
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <CityIcon size={16} />
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
            nations={nationsList}
            selectedKey={tempNation}
            onSelectNode={(val) => handlePickNation(val)}
            allOptionLabel="Tất cả quốc gia (All Nations)"
          />
        </div>
      </Modal>
    </div>
  );
}

export default function ListCitiesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading cities...</div>}>
      <ListCitiesContent />
    </Suspense>
  );
}
