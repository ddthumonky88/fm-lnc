'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Button,
  Input,
  Select,
  Table,
  Tag,
  Tooltip,
  message,
  Space,
  Radio,
  Badge,
  Pagination,
  type TableColumnsType,
} from 'antd';
import {
  SearchOutlined,
  GlobalOutlined,
  TrophyOutlined,
  SafetyOutlined,
  BankOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import {
  fetchAllNations,
  fetchContinents,
  getNationLogoUrl,
  NationItem,
  ConfederationItem,
} from '../../services/api';
import { DomesticCompIcon, ClubIcon, StadiumIcon, CityIcon } from '../../components/EntityIcons';
import { useApp } from '../../context/AppContext';

function NationExplorerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setHeaderTitle, setHeaderId, refreshSignal } = useApp();

  const initialConfed = searchParams.get('confedId') || undefined;

  const [nations, setNations] = useState<NationItem[]>([]);
  const [confederations, setConfederations] = useState<ConfederationItem[]>([]);
  const [selectedConfed, setSelectedConfed] = useState<string | undefined>(initialConfed);
  const [filterText, setFilterText] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(48);

  // Load confederations for filter dropdown
  useEffect(() => {
    fetchContinents()
      .then(setConfederations)
      .catch((e) => console.error('Failed to load confederations', e));
  }, []);

  // Load all nations
  const loadNations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllNations(selectedConfed ? { confedId: selectedConfed } : undefined);
      setNations(data);
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Failed to load nations');
    } finally {
      setLoading(false);
    }
  }, [selectedConfed]);

  useEffect(() => {
    setHeaderTitle('Nations');
    setHeaderId(undefined);
    loadNations();
  }, [loadNations, refreshSignal, setHeaderTitle, setHeaderId]);

  // Client search filter
  const filteredNations = useMemo(() => {
    if (!filterText.trim()) return nations;
    const q = filterText.toLowerCase();
    return nations.filter(
      (n) =>
        n.long_name.toLowerCase().includes(q) ||
        (n.short_name && n.short_name.toLowerCase().includes(q)) ||
        (n.three_letter_name && n.three_letter_name.toLowerCase().includes(q)) ||
        String(n.id).includes(q) ||
        (n.confederation_name && n.confederation_name.toLowerCase().includes(q)),
    );
  }, [nations, filterText]);

  // Paginated nations for card view
  const paginatedNations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredNations.slice(start, start + pageSize);
  }, [filteredNations, currentPage, pageSize]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterText, selectedConfed]);

  const columns: TableColumnsType<NationItem> = useMemo(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 90,
        align: 'left',
        sorter: (a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }),
        render: (id: string) => (
          <Tag color="blue" className="font-mono font-semibold m-0 text-xs">
            {id}
          </Tag>
        ),
      },
      {
        title: 'Flag',
        key: 'flag',
        width: 70,
        align: 'center',
        render: (_: any, record: NationItem) => {
          const flagUrl = getNationLogoUrl(record.id, record.three_letter_name);
          return (
            <div className="w-7 h-5 mx-auto flex items-center justify-center">
              {flagUrl ? (
                <img
                  src={flagUrl}
                  alt={record.long_name}
                  className="w-7 h-5 object-cover rounded shadow-2xs border border-slate-200"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <span
                style={{ display: flagUrl ? 'none' : 'flex' }}
                className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 items-center justify-center text-[10px] font-bold text-slate-600"
              >
                {record.three_letter_name || record.long_name?.[0] || 'N'}
              </span>
            </div>
          );
        },
      },
      {
        title: 'Code',
        dataIndex: 'three_letter_name',
        key: 'code',
        width: 80,
        align: 'center',
        render: (code: string) =>
          code ? (
            <Tag color="geekblue" className="font-mono font-bold text-[11px] m-0">
              {code}
            </Tag>
          ) : (
            <span className="text-gray-300">-</span>
          ),
      },
      {
        title: 'Nation Name',
        dataIndex: 'long_name',
        key: 'name',
        sorter: (a, b) => a.long_name.localeCompare(b.long_name),
        render: (text: string, record: NationItem) => (
          <div>
            <span
              onClick={() => router.push(`/nation/${record.id}`)}
              className="font-bold text-slate-800 hover:text-blue-600 hover:underline cursor-pointer text-sm"
            >
              {text}
            </span>
            {record.short_name && record.short_name !== text && (
              <span className="text-xs text-slate-400 block">{record.short_name}</span>
            )}
          </div>
        ),
      },
      {
        title: 'Confederation',
        dataIndex: 'confederation_name',
        key: 'confed',
        width: 140,
        render: (confed: string, record: NationItem) =>
          confed ? (
            <Tag
              color="cyan"
              className="cursor-pointer hover:opacity-80"
              onClick={() => setSelectedConfed(record.confederation_id)}
            >
              {confed}
            </Tag>
          ) : (
            <span className="text-gray-300">-</span>
          ),
      },
      {
        title: 'Comps',
        dataIndex: 'totalComps',
        key: 'totalComps',
        width: 90,
        align: 'center',
        sorter: (a, b) => (a.totalComps || 0) - (b.totalComps || 0),
        render: (val: number, record: NationItem) =>
          val > 0 ? (
            <Button
              type="text"
              size="small"
              onClick={() => router.push(`/comp?nationId=${record.id}`)}
              className="h-6 px-1.5 font-semibold text-sky-700 hover:bg-sky-50 inline-flex items-center gap-1"
            >
              <DomesticCompIcon size={13} className="text-amber-500" />
              <span>{val}</span>
            </Button>
          ) : (
            <span className="text-gray-300">0</span>
          ),
      },
      {
        title: 'Clubs',
        dataIndex: 'totalClubs',
        key: 'totalClubs',
        width: 80,
        align: 'center',
        sorter: (a, b) => (a.totalClubs || 0) - (b.totalClubs || 0),
        render: (val: number) =>
          val > 0 ? (
            <span className="font-semibold text-slate-700">{val}</span>
          ) : (
            <span className="text-gray-300">0</span>
          ),
      },
      {
        title: 'Stadiums',
        dataIndex: 'totalStadiums',
        key: 'totalStadiums',
        width: 85,
        align: 'center',
        sorter: (a, b) => (a.totalStadiums || 0) - (b.totalStadiums || 0),
        render: (val: number) =>
          val > 0 ? (
            <span className="text-emerald-700 font-medium">{val}</span>
          ) : (
            <span className="text-gray-300">0</span>
          ),
      },
      {
        title: 'Cities',
        dataIndex: 'totalCities',
        key: 'totalCities',
        width: 80,
        align: 'center',
        sorter: (a, b) => (a.totalCities || 0) - (b.totalCities || 0),
        render: (val: number) =>
          val > 0 ? (
            <span className="text-indigo-700 font-medium">{val}</span>
          ) : (
            <span className="text-gray-300">0</span>
          ),
      },
      {
        title: 'Awards',
        dataIndex: 'totalAwards',
        key: 'totalAwards',
        width: 80,
        align: 'center',
        sorter: (a, b) => (a.totalAwards || 0) - (b.totalAwards || 0),
        render: (val: number) =>
          val > 0 ? (
            <span className="text-amber-600 font-medium">{val}</span>
          ) : (
            <span className="text-gray-300">0</span>
          ),
      },
      {
        title: 'Total Records',
        dataIndex: 'totalChildren',
        key: 'totalChildren',
        width: 110,
        align: 'center',
        sorter: (a, b) => (a.totalChildren || 0) - (b.totalChildren || 0),
        render: (val: number) => (
          <Badge
            count={val || 0}
            overflowCount={99999}
            color={val > 0 ? '#108ee9' : '#cbd5e1'}
            showZero
          />
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 110,
        align: 'center',
        render: (_: any, record: NationItem) => (
          <Button
            type="primary"
            ghost
            size="small"
            icon={<ApartmentOutlined />}
            onClick={() => router.push(`/nation/${record.id}`)}
          >
            Hub
          </Button>
        ),
      },
    ],
    [router],
  );

  return (
    <div className="space-y-4">
      {/* Top Header Banner */}
      <div className="bg-[#e2f0fd] rounded-lg border border-[#cbe4fa] px-4 py-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-sm shadow-sky-500/30">
              <GlobalOutlined className="text-xl" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-800 m-0">Nations</h1>
                <Tag color="blue" className="font-semibold text-xs m-0">
                  {filteredNations.length} Countries
                </Tag>
              </div>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Manage all national structures, competitions, clubs, stadiums, and cities
              </p>
            </div>
          </div>

          {/* Controls: Confederation Filter, Search & View toggle */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <Select
              allowClear
              placeholder="All Confederations"
              value={selectedConfed}
              onChange={(val) => setSelectedConfed(val)}
              className="w-full sm:w-48"
              options={[
                { value: undefined, label: 'All Confederations' },
                ...confederations.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.totalNations})`,
                })),
              ]}
            />
            <Input
              prefix={<SearchOutlined className="text-gray-400" />}
              placeholder="Search nation / code / ID..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              allowClear
              className="w-full sm:w-60"
            />
            <Radio.Group
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              buttonStyle="solid"
              size="middle"
            >
              <Radio.Button value="card">
                <Tooltip title="Card Grid">
                  <AppstoreOutlined />
                </Tooltip>
              </Radio.Button>
              <Radio.Button value="table">
                <Tooltip title="Table View">
                  <UnorderedListOutlined />
                </Tooltip>
              </Radio.Button>
            </Radio.Group>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'card' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3.5">
            {paginatedNations.map((n) => (
              <div
                key={n.id}
                className="bg-white border border-gray-200 hover:border-blue-400 rounded-lg p-3 shadow-2xs hover:shadow-md transition-all duration-150 flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar: ID and Confederation Tag */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <Tag color="blue" className="font-bold text-[11px] m-0 shrink-0">
                      {n.id}
                    </Tag>
                    {n.confederation_name && (
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate max-w-[100px]">
                        {n.confederation_name}
                      </span>
                    )}
                  </div>

                  {/* Flag & Title */}
                  <div className="flex items-center gap-2 mb-2">
                    {getNationLogoUrl(n.id, n.three_letter_name) ? (
                      <div className="w-7 h-5 shrink-0 flex items-center justify-center">
                        <img
                          src={getNationLogoUrl(n.id, n.three_letter_name)}
                          alt={n.long_name}
                          className="w-7 h-5 object-cover rounded shadow-2xs border border-slate-200"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : null}
                    {n.three_letter_name && (
                      <Tag color="geekblue" className="font-mono font-bold text-[10px] m-0 shrink-0">
                        {n.three_letter_name}
                      </Tag>
                    )}
                  </div>

                  <h3
                    onClick={() => router.push(`/nation/${n.id}`)}
                    className="font-bold text-xs sm:text-[13px] leading-5 text-slate-800 hover:text-blue-600 hover:underline cursor-pointer transition-colors line-clamp-1 mb-2.5"
                    title={n.long_name}
                  >
                    {n.long_name}
                  </h3>

                  {/* Counts Mini Grid */}
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 mb-3 bg-slate-50/80 p-2 rounded border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <DomesticCompIcon size={12} className="text-amber-500" /> Comps:
                      </span>
                      <strong className="text-slate-700">{n.totalComps || 0}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <ClubIcon size={12} className="text-blue-500" /> Clubs:
                      </span>
                      <strong className="text-slate-700">{n.totalClubs || 0}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <StadiumIcon size={12} className="text-emerald-500" /> Stad:
                      </span>
                      <strong className="text-slate-700">{n.totalStadiums || 0}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <CityIcon size={12} className="text-sky-500" /> Cities:
                      </span>
                      <strong className="text-slate-700">{n.totalCities || 0}</strong>
                    </div>
                  </div>
                </div>

                {/* Card Actions: Open Hub & View Comps */}
                <div className="flex items-center gap-1.5 pt-1">
                  <Button
                    type="primary"
                    ghost
                    size="small"
                    icon={<ApartmentOutlined />}
                    onClick={() => router.push(`/nation/${n.id}`)}
                    className="flex-1 text-[11px] h-7 px-1"
                  >
                    Hub
                  </Button>
                  {(n.totalComps || 0) > 0 && (
                    <Button
                      size="small"
                      icon={<DomesticCompIcon size={13} className="text-amber-500" />}
                      onClick={() => router.push(`/comp?nationId=${n.id}`)}
                      className="text-[11px] h-7 px-2"
                      title="View Competitions"
                    />
                  )}
                </div>
              </div>
            ))}

            {filteredNations.length === 0 && !loading && (
              <div className="col-span-full py-16 text-center text-gray-400 italic">
                No nations match your search criteria.
              </div>
            )}
          </div>

          {/* Pagination for Card Grid */}
          {filteredNations.length > pageSize && (
            <div className="flex justify-center pt-4">
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={filteredNations.length}
                onChange={(page, pSize) => {
                  setCurrentPage(page);
                  setPageSize(pSize);
                }}
                showSizeChanger
                pageSizeOptions={['24', '48', '96', '144']}
                showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} nations`}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xs">
          <Table<NationItem>
            columns={columns}
            dataSource={filteredNations}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 50,
              showSizeChanger: true,
              pageSizeOptions: ['25', '50', '100', '200'],
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} nations`,
            }}
            scroll={{ x: 'max-content' }}
            size="middle"
          />
        </div>
      )}
    </div>
  );
}

export default function NationsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading nations...</div>}>
      <NationExplorerContent />
    </Suspense>
  );
}
