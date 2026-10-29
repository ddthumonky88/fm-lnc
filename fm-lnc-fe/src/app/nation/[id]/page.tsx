'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  CheckOutlined,
  EditOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import {
  fetchNationHub,
  fetchDomesticCompetitions,
  fetchStadiums,
  fetchCities,
  fetchRegions,
  fetchAwards,
  getNationLogoUrl,
  deleteRecord,
  NationHubData,
  RegionItem,
} from '../../../services/api';
import CardGrid from '../../../components/CardGrid';
import CompetitionGroupView from '../../../components/CompetitionGroupView';
import CityGroupView from '../../../components/CityGroupView';
import RecordDetailView from '../../../components/RecordDetailView';
import {
  DomesticCompIcon,
  StadiumIcon,
  CityIcon,
  AwardIcon,
} from '../../../components/EntityIcons';
import { EntityType, RecordType, NationTabKey, NationTabKeyValue } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { matchRecordSearch } from '../../../utils/search';

const CONFED_ID_MAP: Record<string, string> = {
  '1': 'CAF',
  '2': 'AFC',
  '3': 'UEFA',
  '4': 'CONCACAF',
  '5': 'OFC',
  '6': 'CONMEBOL',
  '7': 'World',
  '8': 'EXTINCT',
};

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
  const [activeTab, setActiveTab] = useState<NationTabKeyValue>(NationTabKey.INFO);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);

  // Regions state for City filter
  const [regions, setRegions] = useState<RegionItem[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<number | string>('all');

  // Server pagination and search states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    message.success(`Copied: ${text}`);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const selectedRegionIdRef = useRef(selectedRegionId);
  useEffect(() => {
    selectedRegionIdRef.current = selectedRegionId;
  }, [selectedRegionId]);

  const pageSizeRef = useRef(pageSize);
  useEffect(() => {
    pageSizeRef.current = pageSize;
  }, [pageSize]);

  // Load records for active tab
  const loadTabRecords = useCallback(
    async (
      tabKey: NationTabKeyValue,
      page = 1,
      keyword = '',
      size = 20,
      regionId?: number | string,
    ) => {
      if (!nationId || tabKey === NationTabKey.INFO) return;
      setTabLoading(true);
      try {
        const effRegionId = regionId !== undefined ? regionId : selectedRegionIdRef.current;
        const query: any = { page: page - 1, size, keyword };
        if (tabKey === NationTabKey.CITIES && effRegionId && effRegionId !== 'all') {
          query.regionId = Number(effRegionId);
        }
        let data: any[] = [];
        if (tabKey === NationTabKey.DOMESTIC_COMPS) {
          data = await fetchDomesticCompetitions(nationId, query);
        } else if (tabKey === NationTabKey.STADIUMS) {
          data = await fetchStadiums(nationId, query);
        } else if (tabKey === NationTabKey.CITIES) {
          data = await fetchCities(nationId, query);
        } else if (tabKey === NationTabKey.AWARDS) {
          data = await fetchAwards(nationId, query);
        }
        const list = Array.isArray(data) ? data : (data as any)?.content || [];
        setRecords(list);
        const total = (data as any)?.totalElements ?? (data as any)?.total ?? list.length;
        setTotalRecords(total);
        setNationHub((prev) => {
          if (!prev) return prev;
          const keyMap: Record<string, keyof typeof prev.counts> = {
            [NationTabKey.DOMESTIC_COMPS]: 'domesticComps',
            [NationTabKey.STADIUMS]: 'stadiums',
            [NationTabKey.CITIES]: 'cities',
            [NationTabKey.AWARDS]: 'awards',
          };
          const countKey = keyMap[tabKey];
          if (countKey && !keyword && (tabKey !== NationTabKey.CITIES || effRegionId === 'all')) {
            return {
              ...prev,
              counts: {
                ...prev.counts,
                [countKey]: total,
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

      // Fetch regions for City filter
      fetchRegions(nationId)
        .then((regs) => setRegions(regs || []))
        .catch((err) => console.error('Failed to load regions', err));

      const nation = hub.nation;
      const confedId =
        nation?.confed_id ||
        nation?.confederation_id ||
        nation?.confed?.id ||
        nation?.confederation?.id;
      const confedName =
        (confedId && CONFED_ID_MAP[String(confedId)]) ||
        nation?.confed?.name ||
        nation?.confederation?.name ||
        nation?.confed_name ||
        'Confederation';
      const nationCode =
        nation?.three_letter_name ||
        nation?.name_3l ||
        nation?.short_name ||
        nation?.name_sh;
      const nationName =
        nation?.long_name ||
        nation?.name_lg ||
        nation?.short_name ||
        nation?.name_sh;
      const nationTitle = nationCode
        ? `[${nationCode}] ${nationName || nationId}`
        : nationName || `Nation ${nationId}`;

      setHeaderTitle(nationTitle);
      setHeaderId(hub.nation?.id);
      setBackHref(confedId ? `/confed/${confedId}` : '/');
      setBreadcrumbs([
        {
          title: 'FM',
          href: '/',
        },
        ...(confedId
          ? [
              {
                title: confedName,
                href: `/confed/${confedId}`,
              },
            ]
          : []),
        {
          title: nationCode || nationId,
        },
      ]);
      setHeaderLogo({
        url: getNationLogoUrl(nation?.id || nationId, nationCode),
        alt: nationName || `Nation ${nationId}`,
        isFlag: true,
      });

      // Keep active tab if it exists, otherwise default to INFO
      let targetTab: NationTabKeyValue = activeTabRef.current || NationTabKey.INFO;
      if (targetTab !== NationTabKey.INFO) {
        const countForTarget =
          targetTab === NationTabKey.DOMESTIC_COMPS
            ? hub.counts.domesticComps
            : targetTab === NationTabKey.STADIUMS
              ? hub.counts.stadiums
              : targetTab === NationTabKey.CITIES
                ? hub.counts.cities
                : targetTab === NationTabKey.AWARDS
                  ? hub.counts.awards
                  : 0;

        if (!countForTarget || countForTarget === 0) {
          targetTab = NationTabKey.INFO;
        }
      }

      setActiveTab(targetTab);
      if (targetTab !== NationTabKey.INFO) {
        await loadTabRecords(targetTab, 1, '', pageSizeRef.current, selectedRegionIdRef.current);
      }
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Failed to load nation hub');
    } finally {
      setLoading(false);
    }
  }, [
    nationId,
    loadTabRecords,
    setHeaderTitle,
    setHeaderId,
    setBreadcrumbs,
    setBackHref,
    setHeaderLogo,
  ]);

  useEffect(() => {
    loadNationData();
    return () => {
      setBreadcrumbs([]);
      setBackHref(null);
      setHeaderLogo(null);
      setHeaderId(undefined);
    };
  }, [nationId, refreshSignal]);

  const handlePageChange = (newPage: number, newPageSize?: number) => {
    const effSize = newPageSize && newPageSize !== pageSize ? newPageSize : pageSize;
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize);
    }
    setCurrentPage(newPage);
    if (activeTab !== NationTabKey.INFO) {
      loadTabRecords(activeTab, newPage, searchKeyword, effSize, selectedRegionId);
    }
  };

  const handleSearchSubmit = () => {
    const kw = searchInput.trim();
    setSearchKeyword(kw);
    setCurrentPage(1);
    if (activeTab !== NationTabKey.INFO) {
      loadTabRecords(activeTab, 1, kw, pageSize, selectedRegionId);
    }
  };

  const handleSelectRegion = (regionVal: number | string) => {
    setSelectedRegionId(regionVal);
    setCurrentPage(1);
    loadTabRecords(NationTabKey.CITIES, 1, searchKeyword, pageSize, regionVal);
  };

  const handleSwitchTab = async (key: string) => {
    const tabKey = key as NationTabKeyValue;
    setActiveTab(tabKey);
    setSearchInput('');
    setSearchKeyword('');
    setCurrentPage(1);
    setRecords([]);
    setSelectedRegionId('all');
    if (tabKey !== NationTabKey.INFO) {
      await loadTabRecords(tabKey, 1, '', pageSize, 'all');
    }
  };

  const handleDelete = async (type: RecordType, id: string) => {
    try {
      await deleteRecord(type, id);
      message.success('Record deleted');
      setRecords((prev) => prev.filter((r) => String(r.id) !== String(id)));
      setNationHub((prev) => {
        if (!prev) return prev;
        const keyMap: Record<string, keyof typeof prev.counts> = {
          [NationTabKey.DOMESTIC_COMPS]: 'domesticComps',
          [NationTabKey.STADIUMS]: 'stadiums',
          [NationTabKey.CITIES]: 'cities',
          [NationTabKey.AWARDS]: 'awards',
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

  // Filtered / enriched records
  const filteredRecords = useMemo(() => {
    return !nationHub?.nation
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
  }, [records, nationHub]);

  const serverPagination = {
    current: currentPage,
    pageSize,
    total: totalRecords,
    onChange: handlePageChange,
  };

  // Tab configurations: Info is always first, then hide any tab that has 0 records
  const tabItems = useMemo(() => {
    const list: any[] = [];
    const compCount = nationHub?.counts?.domesticComps ?? 0;
    const stadiumCount = nationHub?.counts?.stadiums ?? 0;
    const cityCount = nationHub?.counts?.cities ?? 0;
    const awardCount = nationHub?.counts?.awards ?? 0;

    list.push({
      key: NationTabKey.INFO,
      label: (
        <span className={activeTab === NationTabKey.INFO ? 'font-bold' : ''}>
          Info
        </span>
      ),
    });

    if (compCount > 0) {
      list.push({
        key: NationTabKey.DOMESTIC_COMPS,
        label: (
          <Space size={4} title="Competitions">
            <DomesticCompIcon size={18} className="text-amber-500" />
            <span
              className={`hidden sm:inline ${activeTab === NationTabKey.DOMESTIC_COMPS ? 'font-bold' : ''}`}
            >
              Competitions
            </span>
            <Badge
              count={compCount}
              overflowCount={99999}
              style={{
                backgroundColor: activeTab === NationTabKey.DOMESTIC_COMPS ? '#1d70b8' : '#94a3b8',
              }}
            />
          </Space>
        ),
      });
    }

    if (stadiumCount > 0) {
      list.push({
        key: NationTabKey.STADIUMS,
        label: (
          <Space size={4} title="Stadiums">
            <StadiumIcon size={18} className="text-emerald-500" />
            <span
              className={`hidden sm:inline ${activeTab === NationTabKey.STADIUMS ? 'font-bold' : ''}`}
            >
              Stadiums
            </span>
            <Badge
              count={stadiumCount}
              overflowCount={99999}
              style={{
                backgroundColor: activeTab === NationTabKey.STADIUMS ? '#1d70b8' : '#94a3b8',
              }}
            />
          </Space>
        ),
      });
    }

    if (cityCount > 0) {
      list.push({
        key: NationTabKey.CITIES,
        label: (
          <Space size={4} title="Cities">
            <CityIcon size={18} className="text-sky-500" />
            <span
              className={`hidden sm:inline ${activeTab === NationTabKey.CITIES ? 'font-bold' : ''}`}
            >
              Cities
            </span>
            <Badge
              count={cityCount}
              overflowCount={99999}
              style={{ backgroundColor: activeTab === NationTabKey.CITIES ? '#1d70b8' : '#94a3b8' }}
            />
          </Space>
        ),
      });
    }

    if (awardCount > 0) {
      list.push({
        key: NationTabKey.AWARDS,
        label: (
          <Space size={4} title="Awards">
            <AwardIcon size={18} className="text-yellow-500" />
            <span
              className={`hidden sm:inline ${activeTab === NationTabKey.AWARDS ? 'font-bold' : ''}`}
            >
              Awards
            </span>
            <Badge
              count={awardCount}
              overflowCount={99999}
              style={{ backgroundColor: activeTab === NationTabKey.AWARDS ? '#1d70b8' : '#94a3b8' }}
            />
          </Space>
        ),
      });
    }

    return list;
  }, [nationHub, activeTab]);

  // Keep activeTab synchronized with available tabs
  useEffect(() => {
    if (tabItems.length > 0 && !tabItems.some((t) => t.key === activeTab)) {
      const nextTab = tabItems[0].key as NationTabKeyValue;
      setActiveTab(nextTab);
      loadTabRecords(nextTab);
    }
  }, [tabItems, activeTab, loadTabRecords]);

  const handleNavigate = (step: any) => {
    if (step.level === 'INDEPENDENT_CLUBS') {
      const nId = step.nationId || step.metadata?.nation_id || nationId;
      const fakeId =
        step.id && (String(step.id).startsWith('oth-') || String(step.id).startsWith('ext-'))
          ? step.id
          : step.metadata?.is_extinct
            ? `ext-${nId}`
            : `oth-${nId}`;
      router.push(`/comp/${fakeId}`);
    } else if (
      step.level === 'CLUBS_IN_COMP' ||
      step.level === 'COMP_AWARDS' ||
      step.type === 'competition'
    ) {
      router.push(`/comp/${step.id}`);
    }
  };

  const nation = nationHub?.nation;
  const nationShortName =
    nation?.short_name ||
    nation?.name_sh ||
    nation?.long_name ||
    nation?.name_lg ||
    `Nation ${nationId}`;
  const nationLongName = nation?.long_name || nation?.name_lg;

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
              {getNationLogoUrl(nationId, nation?.three_letter_name) ? (
                <img
                  src={getNationLogoUrl(nationId, nation?.three_letter_name)}
                  alt={nationShortName}
                  className="w-9 h-6 object-cover rounded shadow-2xs border border-slate-300 shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
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
                      <span>{nationId}</span>
                    </Tag>
                  </Tooltip>
                </div>
                {/* Bottom: Tên (thường là short name) */}
                <h2 className="text-base sm:text-lg font-bold text-gray-800 m-0 leading-snug">
                  {nationShortName}
                </h2>
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
          {activeTab === NationTabKey.DOMESTIC_COMPS && (
            <CompetitionGroupView
              items={filteredRecords}
              loading={tabLoading}
              onNavigate={handleNavigate}
              onEdit={(rec) => openRecordModal(RecordType.COMPETITION, rec, nationId)}
              onDelete={(rec) => handleDelete(RecordType.COMPETITION, rec.id)}
              emptyText="No domestic competitions found"
              serverPagination={serverPagination}
              extraRight={
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                  <Space.Compact className="flex-1 sm:w-64">
                    <Input
                      placeholder="Search competitions..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onPressEnter={handleSearchSubmit}
                      allowClear
                    />
                    <Button
                      type="primary"
                      icon={<SearchOutlined />}
                      onClick={handleSearchSubmit}
                      title="Search"
                      className="shrink-0 bg-blue-600"
                    />
                  </Space.Compact>
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
          {activeTab === NationTabKey.STADIUMS && (
            <div>
              <div className="flex justify-end items-center gap-2.5 sm:gap-3 mb-4">
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                  <Space.Compact className="flex-1 sm:w-64">
                    <Input
                      placeholder="Search stadiums..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onPressEnter={handleSearchSubmit}
                      allowClear
                    />
                    <Button
                      type="primary"
                      icon={<SearchOutlined />}
                      onClick={handleSearchSubmit}
                      title="Search"
                      className="shrink-0 bg-blue-600"
                    />
                  </Space.Compact>
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
                cardSize="small"
                loading={tabLoading}
                serverPagination={serverPagination}
                onEdit={(rec) => openRecordModal(RecordType.STADIUM, rec, nationId)}
                onDelete={(rec) => handleDelete(RecordType.STADIUM, rec.id)}
                emptyText="No stadiums found"
                defaultPageSize={20}
              />
            </div>
          )}

          {/* Tab 3: Cities */}
          {activeTab === NationTabKey.CITIES && (
            <CityGroupView
              items={filteredRecords}
              loading={tabLoading}
              regions={regions}
              selectedRegion={selectedRegionId}
              onSelectRegion={handleSelectRegion}
              onNavigate={handleNavigate}
              onEdit={(rec) => openRecordModal(RecordType.CITY, rec, nationId)}
              onDelete={(rec) => handleDelete(RecordType.CITY, rec.id)}
              emptyText="No cities found"
              serverPagination={serverPagination}
              extraRight={
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                  <Space.Compact className="flex-1 sm:w-64">
                    <Input
                      placeholder="Search cities..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onPressEnter={handleSearchSubmit}
                      allowClear
                    />
                    <Button
                      type="primary"
                      icon={<SearchOutlined />}
                      onClick={handleSearchSubmit}
                      title="Search"
                      className="shrink-0 bg-blue-600"
                    />
                  </Space.Compact>
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
          {activeTab === NationTabKey.AWARDS && (
            <div>
              <div className="flex justify-end items-center gap-2.5 sm:gap-3 mb-4">
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                  <Space.Compact className="flex-1 sm:w-64">
                    <Input
                      placeholder="Search awards..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onPressEnter={handleSearchSubmit}
                      allowClear
                    />
                    <Button
                      type="primary"
                      icon={<SearchOutlined />}
                      onClick={handleSearchSubmit}
                      title="Search"
                      className="shrink-0 bg-blue-600"
                    />
                  </Space.Compact>
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
                serverPagination={serverPagination}
                onEdit={(rec) => openRecordModal(RecordType.AWARD, rec, nationId)}
                onDelete={(rec) => handleDelete(RecordType.AWARD, rec.id)}
                emptyText="No awards found"
                defaultPageSize={20}
              />
            </div>
          )}

          {/* Tab: Nation Information */}
          {activeTab === NationTabKey.INFO && nationHub && (
            <RecordDetailView
              data={nationHub.nation}
              type={EntityType.NATION}
              counts={nationHub.counts}
              onEdit={() => openRecordModal(EntityType.NATION, nationHub.nation)}
              onNavigateConfed={(cId) => router.push(`/confed/${cId}`)}
              onSwitchTab={(tab) => handleSwitchTab(tab as NationTabKeyValue)}
              onNavigateFakeComp={(fakeId) => router.push(`/comp/${fakeId}`)}
            />
          )}
        </div>
      )}
    </div>
  );
}
