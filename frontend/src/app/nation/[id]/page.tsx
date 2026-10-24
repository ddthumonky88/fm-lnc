'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Breadcrumb, Tabs, Tag, Badge, Input, Button, Space, message, Spin, Tooltip } from 'antd';
import {
  TrophyOutlined,
  BankOutlined,
  EnvironmentOutlined,
  StarOutlined,
  SearchOutlined,
  PlusOutlined,
  ArrowLeftOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import {
  fetchNationHub,
  fetchDomesticCompetitions,
  fetchStadiums,
  fetchCities,
  fetchAwards,
  getNationLogoUrl,
  deleteRecord,
  NationHubData,
} from '../../../services/api';
import CardGrid from '../../../components/CardGrid';
import CompetitionGroupView from '../../../components/CompetitionGroupView';
import CityGroupView from '../../../components/CityGroupView';
import { CompIcon, StadiumIcon, CityIcon, AwardIcon } from '../../../components/EntityIcons';
import { EntityType, RecordType } from '../../../types';
import { useApp } from '../../../context/AppContext';

export default function NationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const {
    openRecordModal,
    setHeaderTitle,
    setHeaderId,
    setBreadcrumbs,
    setBackHref,
    setHeaderLogo,
    refreshSignal,
  } = useApp();

  const nationId = params?.id ? String(params.id) : '';

  const [nationHub, setNationHub] = useState<NationHubData | null>(null);
  const [activeTab, setActiveTab] = useState<'DOMESTIC_COMPS' | 'STADIUMS' | 'CITIES' | 'AWARDS'>(
    'DOMESTIC_COMPS',
  );
  const [records, setRecords] = useState<any[]>([]);
  const [tableFilter, setTableFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);

  // Load records for active tab
  const loadTabRecords = useCallback(
    async (tabKey: 'DOMESTIC_COMPS' | 'STADIUMS' | 'CITIES' | 'AWARDS') => {
      if (!nationId) return;
      setTabLoading(true);
      try {
        let data: any[] = [];
        if (tabKey === 'DOMESTIC_COMPS') {
          data = await fetchDomesticCompetitions(nationId);
        } else if (tabKey === 'STADIUMS') {
          data = await fetchStadiums(nationId);
        } else if (tabKey === 'CITIES') {
          data = await fetchCities(nationId);
        } else if (tabKey === 'AWARDS') {
          data = await fetchAwards(nationId);
        }
        setRecords(data);
        setNationHub((prev) => {
          if (!prev) return prev;
          const keyMap: Record<string, keyof typeof prev.counts> = {
            DOMESTIC_COMPS: 'domesticComps',
            STADIUMS: 'stadiums',
            CITIES: 'cities',
            AWARDS: 'awards',
          };
          const countKey = keyMap[tabKey];
          if (countKey && prev.counts[countKey] !== data.length) {
            return {
              ...prev,
              counts: {
                ...prev.counts,
                [countKey]: data.length,
              },
            };
          }
          return prev;
        });
      } catch (err: any) {
        console.error(err);
        message.error(err.message || 'Failed to load tab data');
      } finally {
        setTabLoading(false);
      }
    },
    [nationId],
  );

  // Load initial Nation Hub
  const loadNationData = useCallback(async () => {
    if (!nationId) return;
    setLoading(true);
    try {
      const hub = await fetchNationHub(nationId);
      setNationHub(hub);

      const nation = hub.nation;
      const confedId = nation?.confederation_id;
      const confedName = nation?.confederation?.name || 'Confederation';
      const nationCode = nation?.three_letter_name;
      const nationName = nation?.long_name;
      const nationTitle = nationCode ? `[${nationCode}] ${nationName}` : (nationName || `Nation ${nationId}`);

      setHeaderTitle(nationTitle);
      setHeaderId(hub.nation?.id);
      setBackHref(confedId ? `/confederation/${confedId}` : '/');
      setBreadcrumbs([
        {
          title: 'HOME',
          href: '/',
        },
        ...(confedId
          ? [
              {
                title: confedName,
                href: `/confederation/${confedId}`,
              },
            ]
          : []),
        {
          title: nationName || nationTitle,
        },
      ]);
      setHeaderLogo({
        url: getNationLogoUrl(nation.id, nation.three_letter_name),
        alt: nation.long_name,
        isFlag: true,
      });

      // Select first tab that has records
      let defaultTab: 'DOMESTIC_COMPS' | 'STADIUMS' | 'CITIES' | 'AWARDS' = 'DOMESTIC_COMPS';
      if (hub.counts.domesticComps > 0) defaultTab = 'DOMESTIC_COMPS';
      else if (hub.counts.stadiums > 0) defaultTab = 'STADIUMS';
      else if (hub.counts.cities > 0) defaultTab = 'CITIES';
      else if (hub.counts.awards > 0) defaultTab = 'AWARDS';

      setActiveTab(defaultTab);
      await loadTabRecords(defaultTab);
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Failed to load nation hub');
    } finally {
      setLoading(false);
    }
  }, [nationId, loadTabRecords, setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo]);

  useEffect(() => {
    loadNationData();
    return () => {
      setBreadcrumbs([]);
      setBackHref(null);
      setHeaderLogo(null);
      setHeaderId(undefined);
    };
  }, [loadNationData, refreshSignal, setBreadcrumbs, setBackHref, setHeaderLogo, setHeaderId]);

  const handleSwitchTab = async (key: 'DOMESTIC_COMPS' | 'STADIUMS' | 'CITIES' | 'AWARDS') => {
    setActiveTab(key);
    setTableFilter('');
    setRecords([]);
    await loadTabRecords(key);
  };

  const handleDelete = async (type: RecordType, id: string) => {
    try {
      await deleteRecord(type, id);
      message.success('Record deleted');
      setRecords((prev) => prev.filter((r) => String(r.id) !== String(id)));
      setNationHub((prev) => {
        if (!prev) return prev;
        const keyMap: Record<string, keyof typeof prev.counts> = {
          DOMESTIC_COMPS: 'domesticComps',
          STADIUMS: 'stadiums',
          CITIES: 'cities',
          AWARDS: 'awards',
        };
        const countKey = keyMap[activeTab];
        if (countKey && prev.counts[countKey] > 0) {
          return {
            ...prev,
            counts: {
              ...prev.counts,
              [countKey]: prev.counts[countKey] - 1,
            },
          };
        }
        return prev;
      });
      loadNationData();
    } catch (err: any) {
      message.error(err.message || 'Delete failed');
    }
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    const enriched = !nationHub?.nation
      ? records
      : records.map((r) => ({
          ...r,
          nation: r.nation || nationHub.nation,
          nation_id: r.nation_id || r.country_id || nationHub.nation.id,
          nation_three_letter:
            r.nation_three_letter ||
            r.nation?.three_letter_name ||
            nationHub.nation.three_letter_name,
        }));

    if (!tableFilter.trim()) return enriched;
    const q = tableFilter.toLowerCase();
    return enriched.filter((r) => {
      const name = (r.long_name || r.name || r.short_name || '').toLowerCase();
      const code = (r.three_letter_name || '').toLowerCase();
      const idStr = String(r.id);
      const cat = (r.categories || '').toLowerCase();
      return name.includes(q) || code.includes(q) || idStr.includes(q) || cat.includes(q);
    });
  }, [records, tableFilter, nationHub]);

  // Tab configurations: Hide any tab that has 0 records
  const tabItems = useMemo(() => {
    const list: any[] = [];
    const compCount = nationHub?.counts?.domesticComps ?? 0;
    const stadiumCount = nationHub?.counts?.stadiums ?? 0;
    const cityCount = nationHub?.counts?.cities ?? 0;
    const awardCount = nationHub?.counts?.awards ?? 0;

    if (compCount > 0) {
      list.push({
        key: 'DOMESTIC_COMPS',
        label: (
          <Space size={4} title="Competitions">
            <CompIcon size={18} className="text-amber-500" />
            <span className={`hidden sm:inline ${activeTab === 'DOMESTIC_COMPS' ? 'font-bold' : ''}`}>Competitions</span>
            <Badge
              count={compCount}
              overflowCount={99999}
              style={{ backgroundColor: activeTab === 'DOMESTIC_COMPS' ? '#1d70b8' : '#94a3b8' }}
            />
          </Space>
        ),
      });
    }

    if (stadiumCount > 0) {
      list.push({
        key: 'STADIUMS',
        label: (
          <Space size={4} title="Stadiums">
            <StadiumIcon size={18} className="text-emerald-500" />
            <span className={`hidden sm:inline ${activeTab === 'STADIUMS' ? 'font-bold' : ''}`}>Stadiums</span>
            <Badge
              count={stadiumCount}
              overflowCount={99999}
              style={{ backgroundColor: activeTab === 'STADIUMS' ? '#1d70b8' : '#94a3b8' }}
            />
          </Space>
        ),
      });
    }

    if (cityCount > 0) {
      list.push({
        key: 'CITIES',
        label: (
          <Space size={4} title="Cities">
            <CityIcon size={18} className="text-indigo-500" />
            <span className={`hidden sm:inline ${activeTab === 'CITIES' ? 'font-bold' : ''}`}>Cities</span>
            <Badge
              count={cityCount}
              overflowCount={99999}
              style={{ backgroundColor: activeTab === 'CITIES' ? '#1d70b8' : '#94a3b8' }}
            />
          </Space>
        ),
      });
    }

    if (awardCount > 0) {
      list.push({
        key: 'AWARDS',
        label: (
          <Space size={4} title="Awards">
            <AwardIcon size={18} className="text-yellow-500" />
            <span className={`hidden sm:inline ${activeTab === 'AWARDS' ? 'font-bold' : ''}`}>Awards</span>
            <Badge
              count={awardCount}
              overflowCount={99999}
              style={{ backgroundColor: activeTab === 'AWARDS' ? '#1d70b8' : '#94a3b8' }}
            />
          </Space>
        ),
      });
    }

    // Fallback: If nation has 0 for everything, keep Competitions tab so user can add records
    if (list.length === 0) {
      list.push({
        key: 'DOMESTIC_COMPS',
        label: (
          <Space size={4} title="Competitions">
            <CompIcon size={18} className="text-amber-500" />
            <span className={`hidden sm:inline ${activeTab === 'DOMESTIC_COMPS' ? 'font-bold' : ''}`}>Competitions</span>
          </Space>
        ),
      });
    }

    return list;
  }, [nationHub, activeTab]);

  // Keep activeTab synchronized with available tabs
  useEffect(() => {
    if (tabItems.length > 0 && !tabItems.some((t) => t.key === activeTab)) {
      const nextTab = tabItems[0].key as 'DOMESTIC_COMPS' | 'STADIUMS' | 'CITIES' | 'AWARDS';
      setActiveTab(nextTab);
      loadTabRecords(nextTab);
    }
  }, [tabItems, activeTab, loadTabRecords]);

  const handleNavigate = (step: any) => {
    if (step.level === 'INDEPENDENT_CLUBS') {
      const type = step.metadata?.is_extinct ? 'extinct' : 'other';
      const nId = step.nationId || step.metadata?.nation_id || nationId;
      router.push(`/comp/${type}?nationId=${nId}`);
    } else if (step.level === 'CLUBS_IN_COMP' || step.level === 'COMP_AWARDS' || step.type === 'competition') {
      router.push(`/comp/${step.id}`);
    }
  };

  const nation = nationHub?.nation;
  const nationShortName = nation?.short_name || nation?.long_name || `Nation ${nationId}`;
  const nationLongName = nation?.long_name;

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="py-20 text-center">
          <Spin size="large" description="Loading nation details..." />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-2xs">
          {/* Nation Info Banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <img
                src={getNationLogoUrl(nationId, nation?.three_letter_name)}
                alt={nationShortName}
                className="w-9 h-6 object-cover rounded shadow-2xs border border-slate-300 shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div>
                {/* Top: Tag ID (cho phép copy) + 3N */}
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  <Tooltip title="Click to copy ID">
                    <Tag
                      color="blue"
                      onClick={() => {
                        navigator.clipboard.writeText(String(nationId));
                        message.success(`Copied ID: ${nationId}`);
                      }}
                      className="font-mono font-bold m-0 text-xs cursor-pointer hover:opacity-80 inline-flex items-center gap-1.5"
                    >
                      <CopyOutlined className="text-[11px]" />
                      <span>ID: {nationId}</span>
                    </Tag>
                  </Tooltip>
                  {nation?.three_letter_name && (
                    <Tag color="purple" className="font-mono font-bold m-0 text-xs">
                      {nation.three_letter_name}
                    </Tag>
                  )}
                </div>
                {/* Bottom: Tên (thường là short name) */}
                <h2 className="text-base sm:text-lg font-bold text-gray-800 m-0 leading-snug">
                  {nationShortName}
                </h2>
                {nationLongName && nationLongName !== nationShortName && (
                  <div className="text-xs text-gray-500 mt-0.5">{nationLongName}</div>
                )}
              </div>
            </div>
          </div>

          {/* AntD Tabs */}
          <Tabs
            activeKey={activeTab}
            onChange={(key) => handleSwitchTab(key as any)}
            items={tabItems}
            className="mb-3"
          />

          {/* Tab 1: Domestic Competitions */}
          {activeTab === 'DOMESTIC_COMPS' && (
            <CompetitionGroupView
              items={filteredRecords}
              loading={tabLoading}
              onNavigate={handleNavigate}
              onEdit={(rec) => openRecordModal(RecordType.COMPETITION, rec, nationId)}
              onDelete={(rec) => handleDelete(RecordType.COMPETITION, rec.id)}
              emptyText="No domestic competitions found"
              extraRight={
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                  <Input
                    prefix={<SearchOutlined className="text-gray-400" />}
                    placeholder="Filter competitions..."
                    value={tableFilter}
                    onChange={(e) => setTableFilter(e.target.value)}
                    allowClear
                    className="flex-1 sm:w-64"
                  />
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    className="shrink-0 bg-blue-600"
                    onClick={() => openRecordModal(RecordType.COMPETITION, null, nationId)}
                    title="Add Competition"
                  >
                    <span className="hidden sm:inline">Add Competition</span>
                  </Button>
                </div>
              }
            />
          )}

          {/* Tab 2: Stadiums */}
          {activeTab === 'STADIUMS' && (
            <div>
              <div className="flex justify-end items-center gap-2.5 sm:gap-3 mb-4">
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                  <Input
                    prefix={<SearchOutlined className="text-gray-400" />}
                    placeholder="Filter stadiums..."
                    value={tableFilter}
                    onChange={(e) => setTableFilter(e.target.value)}
                    allowClear
                    className="flex-1 sm:w-64"
                  />
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => openRecordModal(RecordType.STADIUM, null, nationId)}
                    title="Add Stadium"
                  >
                    <span className="hidden sm:inline">Add Stadium</span>
                  </Button>
                </div>
              </div>
              <CardGrid
                items={filteredRecords}
                type={EntityType.STADIUM}
                columns={4}
                loading={tabLoading}
                onEdit={(rec) => openRecordModal(RecordType.STADIUM, rec, nationId)}
                onDelete={(rec) => handleDelete(RecordType.STADIUM, rec.id)}
                emptyText="No stadiums found"
                defaultPageSize={20}
              />
            </div>
          )}

          {/* Tab 3: Cities */}
          {activeTab === 'CITIES' && (
            <CityGroupView
              items={filteredRecords}
              loading={tabLoading}
              onNavigate={handleNavigate}
              onEdit={(rec) => openRecordModal(RecordType.CITY, rec, nationId)}
              onDelete={(rec) => handleDelete(RecordType.CITY, rec.id)}
              emptyText="No cities found"
              extraRight={
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                  <Input
                    prefix={<SearchOutlined className="text-gray-400" />}
                    placeholder="Filter cities..."
                    value={tableFilter}
                    onChange={(e) => setTableFilter(e.target.value)}
                    allowClear
                    className="flex-1 sm:w-64"
                  />
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => openRecordModal(RecordType.CITY, null, nationId)}
                    title="Add City"
                  >
                    <span className="hidden sm:inline">Add City</span>
                  </Button>
                </div>
              }
            />
          )}

          {/* Tab 4: Awards */}
          {activeTab === 'AWARDS' && (
            <div>
              <div className="flex justify-end items-center gap-2.5 sm:gap-3 mb-4">
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                  <Input
                    prefix={<SearchOutlined className="text-gray-400" />}
                    placeholder="Filter awards..."
                    value={tableFilter}
                    onChange={(e) => setTableFilter(e.target.value)}
                    allowClear
                    className="flex-1 sm:w-64"
                  />
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => openRecordModal(RecordType.AWARD, null, nationId)}
                    title="Add Award"
                  >
                    <span className="hidden sm:inline">Add Award</span>
                  </Button>
                </div>
              </div>
              <CardGrid
                items={filteredRecords}
                type={EntityType.AWARD}
                columns={4}
                loading={tabLoading}
                onEdit={(rec) => openRecordModal(RecordType.AWARD, rec, nationId)}
                onDelete={(rec) => handleDelete(RecordType.AWARD, rec.id)}
                emptyText="No awards found"
                defaultPageSize={20}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
