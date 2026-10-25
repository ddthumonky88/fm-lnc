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
  Popconfirm,
  Pagination,
  type TableColumnsType,
} from 'antd';
import {
  SearchOutlined,
  TrophyOutlined,
  SafetyOutlined,
  StarOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  GlobalOutlined,
  FilterOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import {
  fetchAllCompetitions,
  fetchContinents,
  fetchAllNations,
  deleteRecord,
  getNationLogoUrl,
  CompetitionItem,
  ConfederationItem,
  NationItem,
} from '../../services/api';
import { useApp } from '../../context/AppContext';
import { RecordType } from '../../types';
import { DomesticCompIcon, ClubIcon, AwardIcon } from '../../components/EntityIcons';
import { formatCategoryCode, getCategoryTagColor } from '../../components/EntityCard';

const parseColor = (rgbStr?: string | null) => {
  if (!rgbStr) return null;
  const parts = rgbStr.trim().split(/\s+/).map((n) => parseInt(n, 10));
  if (parts.length < 3 || parts.some(isNaN)) return null;
  const [r, g, b] = parts;
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return {
    css: `rgb(${r}, ${g}, ${b})`,
    hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase(),
    rgb: `${r}, ${g}, ${b}`,
  };
};

function CompetitionsExplorerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openRecordModal, setHeaderTitle, setHeaderId, refreshSignal } = useApp();

  const initialConfed = searchParams.get('confedId') || undefined;
  const initialNation = searchParams.get('nationId') || undefined;
  const initialInt = searchParams.get('isInternational')
    ? searchParams.get('isInternational') === 'true'
    : undefined;

  const [competitions, setCompetitions] = useState<CompetitionItem[]>([]);
  const [confederations, setConfederations] = useState<ConfederationItem[]>([]);
  const [nations, setNations] = useState<NationItem[]>([]);

  // Filters
  const [selectedConfed, setSelectedConfed] = useState<string | undefined>(initialConfed);
  const [selectedNation, setSelectedNation] = useState<string | undefined>(initialNation);
  const [scopeFilter, setScopeFilter] = useState<'all' | 'intl' | 'domestic'>(
    initialInt === true ? 'intl' : initialInt === false ? 'domestic' : 'all',
  );
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [filterText, setFilterText] = useState('');

  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Load dropdown choices
  useEffect(() => {
    fetchContinents()
      .then(setConfederations)
      .catch((e) => console.error('Failed to load confederations', e));
    fetchAllNations()
      .then(setNations)
      .catch((e) => console.error('Failed to load nations', e));
  }, []);

  // Filter nations dropdown by selected confederation
  const availableNations = useMemo(() => {
    if (!selectedConfed) return nations;
    return nations.filter((n) => n.confederation_id === selectedConfed);
  }, [nations, selectedConfed]);

  // Load competitions
  const loadCompetitions = useCallback(async () => {
    setLoading(true);
    try {
      const isInt = scopeFilter === 'intl' ? true : scopeFilter === 'domestic' ? false : undefined;
      const data = await fetchAllCompetitions({
        confedId: selectedConfed,
        nationId: selectedNation,
        isInternational: isInt,
      });
      setCompetitions(data);
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Failed to load competitions');
    } finally {
      setLoading(false);
    }
  }, [selectedConfed, selectedNation, scopeFilter]);

  useEffect(() => {
    setHeaderTitle('Competitions');
    setHeaderId(undefined);
    loadCompetitions();
  }, [loadCompetitions, refreshSignal, setHeaderTitle, setHeaderId]);

  // Filter client-side by text & category
  const filteredCompetitions = useMemo(() => {
    return competitions.filter((c) => {
      // Category filter
      if (categoryFilter !== 'all') {
        const cat = (c.categories || '').toLowerCase();
        if (categoryFilter === 'league' && !cat.includes('league')) return false;
        if (categoryFilter === 'cup' && !cat.includes('cup')) return false;
        if (categoryFilter === 'youth' && !cat.includes('youth') && !cat.includes('u21') && !cat.includes('u19'))
          return false;
      }

      // Text query
      if (!filterText.trim()) return true;
      const q = filterText.toLowerCase();
      return (
        c.long_name.toLowerCase().includes(q) ||
        (c.short_name && c.short_name.toLowerCase().includes(q)) ||
        (c.three_letter_name && c.three_letter_name.toLowerCase().includes(q)) ||
        String(c.id).includes(q) ||
        (c.nation_name && c.nation_name.toLowerCase().includes(q)) ||
        (c.confed_name && c.confed_name.toLowerCase().includes(q))
      );
    });
  }, [competitions, categoryFilter, filterText]);

  // Paginated records for card view
  const paginatedCompetitions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCompetitions.slice(start, start + pageSize);
  }, [filteredCompetitions, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterText, categoryFilter, selectedConfed, selectedNation, scopeFilter]);

  const handleDelete = async (id: string) => {
    try {
      await deleteRecord(RecordType.COMPETITION, id);
      message.success('Competition deleted');
      setCompetitions((prev) => prev.filter((c) => String(c.id) !== String(id)));
    } catch (e: any) {
      message.error(e.message || 'Delete failed');
    }
  };

  const columns: TableColumnsType<CompetitionItem> = useMemo(
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
        title: 'Colors',
        key: 'colors',
        width: 70,
        align: 'center',
        render: (_: any, record: CompetitionItem) => {
          const bg = parseColor(record.bg_color);
          const fg = parseColor(record.fg_color);
          if (!bg && !fg) return <span className="text-gray-300">-</span>;
          return (
            <div className="flex items-center justify-center gap-1">
              {bg && (
                <Tooltip title={`Background: ${bg.hex} (${bg.rgb})`}>
                  <span
                    className="inline-block w-4 h-4 rounded border border-black/20 shadow-2xs hover:scale-125 transition-transform cursor-pointer"
                    style={{ backgroundColor: bg.css }}
                  />
                </Tooltip>
              )}
              {fg && (
                <Tooltip title={`Foreground: ${fg.hex} (${fg.rgb})`}>
                  <span
                    className="inline-block w-4 h-4 rounded border border-black/20 shadow-2xs hover:scale-125 transition-transform cursor-pointer"
                    style={{ backgroundColor: fg.css }}
                  />
                </Tooltip>
              )}
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
        title: 'Competition Name',
        dataIndex: 'long_name',
        key: 'name',
        sorter: (a, b) => a.long_name.localeCompare(b.long_name),
        render: (text: string, record: CompetitionItem) => {
          const inactive = (record.inactive_fields || '').toLowerCase().includes('long_name');
          return (
            <div>
              <span
                onClick={() => router.push(`/comp/${record.id}`)}
                className={`font-bold hover:underline cursor-pointer text-sm ${
                  inactive ? 'text-red-500 line-through' : 'text-slate-800 hover:text-blue-600'
                }`}
              >
                {text}
              </span>
              {record.short_name && record.short_name !== text && (
                <span className="text-xs text-slate-400 block">{record.short_name}</span>
              )}
              {record.parent_name && (
                <span className="text-[11px] text-amber-600 block">
                  Parent: {record.parent_name}
                </span>
              )}
              {record.childrenCount !== undefined && record.childrenCount > 0 && (
                <span className="text-[11px] text-blue-600 block">
                  {record.childrenCount} Sub-Competitions
                </span>
              )}
            </div>
          );
        },
      },
      {
        title: 'Country / Scope',
        key: 'scope',
        width: 170,
        render: (_: any, record: CompetitionItem) => {
          if (record.is_international || !record.nation_id) {
            return (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                <GlobalOutlined className="text-indigo-600" />
                <span>International ({record.confed_name || 'Global'})</span>
              </span>
            );
          }
          return (
            <div className="flex items-center gap-1.5">
              {getNationLogoUrl(record.nation_id, record.nation_three_letter) ? (
                <div className="w-5 h-3.5 shrink-0 flex items-center justify-center">
                  <img
                    src={getNationLogoUrl(record.nation_id, record.nation_three_letter)}
                    alt={record.nation_name || 'Nation'}
                    className="w-5 h-3.5 object-cover rounded shadow-2xs border border-slate-200"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              ) : null}
              <span
                onClick={() => router.push(`/nation/${record.nation_id}`)}
                className="font-medium text-xs text-slate-700 hover:text-blue-600 hover:underline cursor-pointer truncate"
              >
                {record.nation_name}
              </span>
            </div>
          );
        },
      },
      {
        title: 'Type',
        dataIndex: 'type',
        key: 'type',
        width: 120,
        render: (_: any, record: CompetitionItem) => {
          const cat = record.type || record.categories;
          if (!cat) return <span className="text-gray-300">-</span>;
          const color = getCategoryTagColor(cat);
          return (
            <Tooltip title={cat} trigger="hover" destroyTooltipOnHide>
              <Tag color={color} className="text-xs m-0 font-semibold font-mono cursor-default">
                {formatCategoryCode(cat)}
              </Tag>
            </Tooltip>
          );
        },
      },
      {
        title: 'Clubs',
        dataIndex: 'clubsCount',
        key: 'clubsCount',
        width: 80,
        align: 'center',
        sorter: (a, b) => (a.clubsCount || 0) - (b.clubsCount || 0),
        render: (val: number) =>
          val > 0 ? (
            <span className="font-semibold text-blue-600 flex items-center justify-center gap-1">
              <ClubIcon size={14} className="text-blue-500" />
              {val}
            </span>
          ) : (
            <span className="text-gray-300">0</span>
          ),
      },
      {
        title: 'Awards',
        dataIndex: 'awardsCount',
        key: 'awardsCount',
        width: 80,
        align: 'center',
        sorter: (a, b) => (a.awardsCount || 0) - (b.awardsCount || 0),
        render: (val: number) =>
          val > 0 ? (
            <span className="font-semibold text-amber-600 flex items-center justify-center gap-1">
              <AwardIcon size={14} className="text-yellow-500" />
              {val}
            </span>
          ) : (
            <span className="text-gray-300">0</span>
          ),
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 100,
        align: 'center',
        render: (_: any, record: CompetitionItem) => (
          <Space size="small">
            <Tooltip title="Edit Competition">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined className="text-blue-600" />}
                onClick={() =>
                  openRecordModal(RecordType.COMPETITION, record, record.nation_id, record.id)
                }
              />
            </Tooltip>
            <Popconfirm
              title="Delete Competition?"
              description="Are you sure you want to delete this competition?"
              onConfirm={() => handleDelete(record.id)}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Delete">
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined className="text-red-500" />}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [openRecordModal, router],
  );

  return (
    <div className="space-y-4">
      {/* Top Header Banner */}
      <div className="bg-[#e2f0fd] rounded-lg border border-[#cbe4fa] px-4 py-3 shadow-2xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-sm shadow-amber-500/30">
              <DomesticCompIcon size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-800 m-0">Competitions</h1>
                <Tag color="orange" className="font-semibold text-xs m-0">
                  {filteredCompetitions.length} Records
                </Tag>
              </div>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Manage domestic leagues, continental tournaments, cups, and competition awards
              </p>
            </div>
          </div>

          {/* Quick Add Action */}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openRecordModal(RecordType.COMPETITION, null, selectedNation)}
            className="bg-blue-600"
            title="Add Competition"
          >
            <span className="hidden sm:inline">Add Competition</span>
          </Button>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-3 pt-3 border-t border-[#cbe4fa] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Scope Toggle */}
            <Radio.Group
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
              size="small"
              buttonStyle="solid"
            >
              <Radio.Button value="all">All</Radio.Button>
              <Radio.Button value="domestic">Domestic</Radio.Button>
              <Radio.Button value="intl">International</Radio.Button>
            </Radio.Group>

            {/* Confederation Select */}
            <Select
              allowClear
              placeholder="Confederation"
              value={selectedConfed}
              onChange={(val) => {
                setSelectedConfed(val);
                setSelectedNation(undefined);
              }}
              size="small"
              className="w-36"
              options={[
                { value: undefined, label: 'All Confeds' },
                ...confederations.map((c) => ({
                  value: c.id,
                  label: c.name,
                })),
              ]}
            />

            {/* Nation Select */}
            <Select
              allowClear
              showSearch
              placeholder="Nation"
              value={selectedNation}
              onChange={(val) => setSelectedNation(val)}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              size="small"
              className="w-40"
              options={[
                { value: undefined, label: 'All Nations' },
                ...availableNations.map((n) => ({
                  value: n.id,
                  label: `${n.three_letter_name ? `[${n.three_letter_name}] ` : ''}${n.long_name}`,
                })),
              ]}
            />

            {/* Category Filter */}
            <Select
              value={categoryFilter}
              onChange={(val) => setCategoryFilter(val)}
              size="small"
              className="w-28"
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'league', label: 'League' },
                { value: 'cup', label: 'Cup' },
                { value: 'youth', label: 'Youth' },
              ]}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Input
              prefix={<SearchOutlined className="text-gray-400" />}
              placeholder="Search competition / ID..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              allowClear
              size="small"
              className="w-full sm:w-56"
            />
            <Radio.Group
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              buttonStyle="solid"
              size="small"
            >
              <Radio.Button value="table">
                <Tooltip title="Table View">
                  <UnorderedListOutlined />
                </Tooltip>
              </Radio.Button>
              <Radio.Button value="card">
                <Tooltip title="Card Grid">
                  <AppstoreOutlined />
                </Tooltip>
              </Radio.Button>
            </Radio.Group>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xs">
          <Table<CompetitionItem>
            columns={columns}
            dataSource={filteredCompetitions}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 50,
              showSizeChanger: true,
              pageSizeOptions: ['25', '50', '100', '200'],
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} competitions`,
            }}
            size="middle"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-3.5">
            {paginatedCompetitions.map((c) => {
              const bg = parseColor(c.bg_color);
              const fg = parseColor(c.fg_color);
              return (
                <div
                  key={c.id}
                  className="bg-white border border-gray-200 hover:border-amber-400 rounded-lg p-3 shadow-2xs hover:shadow-md transition-all duration-150 flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Row: ID and Colors */}
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <Tag color="blue" className="font-bold text-[11px] m-0 shrink-0">
                        {c.id}
                      </Tag>
                      {(bg || fg) && (
                        <div className="flex items-center gap-1 shrink-0">
                          {bg && (
                            <span
                              className="inline-block w-3.5 h-3.5 rounded border border-black/20"
                              style={{ backgroundColor: bg.css }}
                              title={`Background: ${bg.hex}`}
                            />
                          )}
                          {fg && (
                            <span
                              className="inline-block w-3.5 h-3.5 rounded border border-black/20"
                              style={{ backgroundColor: fg.css }}
                              title={`Foreground: ${fg.hex}`}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Scope / Nation tag */}
                    <div className="flex items-center gap-1.5 mb-1.5 text-xs">
                      {c.is_international || !c.nation_id ? (
                        <Tag color="purple" className="text-[10px] m-0 font-semibold">
                          {c.confed_name || 'International'}
                        </Tag>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] text-slate-600 truncate">
                          {getNationLogoUrl(c.nation_id, c.nation_three_letter) ? (
                            <img
                              src={getNationLogoUrl(c.nation_id, c.nation_three_letter)}
                              alt=""
                              className="w-4 h-3 object-cover rounded shadow-2xs inline-block"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : null}
                          <span className="truncate">{c.nation_name}</span>
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <h3
                      onClick={() => router.push(`/comp/${c.id}`)}
                      className="font-bold text-xs sm:text-[13px] leading-5 text-slate-800 hover:text-amber-600 hover:underline cursor-pointer transition-colors line-clamp-1 mb-2"
                      title={c.long_name}
                    >
                      {c.long_name}
                    </h3>

                    {/* Stats pills */}
                    <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
                      <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[11px]">
                        <ClubIcon size={12} className="text-blue-600" />
                        <span>{c.clubsCount || 0} Clubs</span>
                      </span>
                      {(c.awardsCount || 0) > 0 && (
                        <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[11px]">
                          <AwardIcon size={12} className="text-yellow-600" />
                          <span>{c.awardsCount}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-slate-100 pt-2 flex items-center justify-between gap-1">
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined className="text-blue-600 text-xs" />}
                      onClick={() => openRecordModal(RecordType.COMPETITION, c, c.nation_id, c.id)}
                      className="text-xs h-6 px-1.5"
                    >
                      Edit
                    </Button>
                    <Popconfirm
                      title="Delete Competition?"
                      onConfirm={() => handleDelete(c.id)}
                      okText="Delete"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined className="text-red-500 text-xs" />}
                        className="text-xs h-6 px-1.5"
                      />
                    </Popconfirm>
                  </div>
                </div>
              );
            })}

            {filteredCompetitions.length === 0 && !loading && (
              <div className="col-span-full py-16 text-center text-gray-400 italic">
                No competitions match your search criteria.
              </div>
            )}
          </div>

          {filteredCompetitions.length > pageSize && (
            <div className="flex justify-center pt-4">
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={filteredCompetitions.length}
                onChange={(page, pSize) => {
                  setCurrentPage(page);
                  setPageSize(pSize);
                }}
                showSizeChanger
                pageSizeOptions={['25', '50', '100', '200']}
                showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} competitions`}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CompetitionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading competitions...</div>}>
      <CompetitionsExplorerContent />
    </Suspense>
  );
}
