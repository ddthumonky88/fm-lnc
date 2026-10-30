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
  fetchNationInfo,
  fetchDomesticCompetitions,
  fetchStadiums,
  fetchCities,
  fetchRegions,
  fetchAwards,
  getNationLogoUrl,
  deleteRecord,
  NationInfoData,
  getNationCompetitionDisplayCount,
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
import TabIconBadge from '../../../components/TabIconBadge';
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
  '7': 'WORLD',
  '8': 'EXTINCT',
  CAF: 'CAF',
  AFC: 'AFC',
  UEFA: 'UEFA',
  CONCACAF: 'CONCACAF',
  OFC: 'OFC',
  CONMEBOL: 'CONMEBOL',
  WORLD: 'WORLD',
  World: 'WORLD',
  EXTINCT: 'EXTINCT',
  Extinct: 'EXTINCT',
};

function updateNationStatsCount(
  stats: NationInfoData['stats'],
  tabKey: NationTabKeyValue,
  count: number,
): NationInfoData['stats'] {
  switch (tabKey) {
    case NationTabKey.DOMESTIC_COMPS:
      return stats;
    case NationTabKey.STADIUMS:
      return { ...stats, stadiums: count };
    case NationTabKey.CITIES:
      return { ...stats, cities: count };
    case NationTabKey.AWARDS:
      return { ...stats, awards: { ...stats.awards, nation: count } };
    default:
      return stats;
  }
}

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

  const [nationHub, setNationHub] = useState<NationInfoData | null>(null);
  const [activeTab, setActiveTab] = useState<NationTabKeyValue>(NationTabKey.INFO);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);

  // Regions state for City filter
  const [regions, setRegions] = useState<RegionItem[]>([]);
  const regionsNationIdRef = useRef('');
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
          query.regionCode = String(effRegionId);
        }
        let data: any[] = [];
        if (tabKey === NationTabKey.DOMESTIC_COMPS) {
          data = await fetchDomesticCompetitions(nationId, query);
        } else if (tabKey === NationTabKey.STADIUMS) {
          data = await fetchStadiums(nationId, query);
        } else if (tabKey === NationTabKey.CITIES) {
          if (regionsNationIdRef.current !== nationId) {
            setRegions([]);
            const [cities, fetchedRegions] = await Promise.all([
              fetchCities(nationId, query),
              fetchRegions(nationId).catch((err) => {
                console.error('Failed to load regions', err);
                return [];
              }),
            ]);
            data = cities;
            setRegions(fetchedRegions || []);
            regionsNationIdRef.current = nationId;
          } else {
            data = await fetchCities(nationId, query);
          }
        } else if (tabKey === NationTabKey.AWARDS) {
          data = await fetchAwards(nationId, query);
        }
        const list = Array.isArray(data) ? data : (data as any)?.content || [];
        setRecords(list);
        const total = (data as any)?.totalElements ?? (data as any)?.total ?? list.length;
        setTotalRecords(total);
        setNationHub((prev) => {
          if (!prev) return prev;
          if (!keyword && (tabKey !== NationTabKey.CITIES || effRegionId === 'all')) {
            return {
              ...prev,
              stats: updateNationStatsCount(prev.stats, tabKey, total),
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
      const nation = await fetchNationInfo(nationId);
      console.log('Nation: ', nation);
      setNationHub(nation);

      const rawConfed = nation?.confed || null;
      const confedName = rawConfed ? (CONFED_ID_MAP[String(rawConfed)] || String(rawConfed).toUpperCase()) : null;
      const nationName = nation?.name_sh || nation?.name_lg;
      const nationCode = nation?.name_3l || nation?.id;
      const nationTitle = nationName || nationCode;

      setHeaderId(nation?.id);
      setHeaderTitle(nationTitle);
      setBackHref(confedName ? `/confed/${confedName}` : '/');
      setBreadcrumbs([
        {
          title: 'FM',
          href: '/',
        },
        ...(confedName
          ? [
              {
                title: confedName,
                href: `/confed/${confedName}`,
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
        let countForTarget = 0;

        switch (targetTab) {
          case NationTabKey.DOMESTIC_COMPS:
            countForTarget = getNationCompetitionDisplayCount(nation.stats);
            break;
          case NationTabKey.STADIUMS:
            countForTarget = nation.stats.stadiums;
            break;
          case NationTabKey.CITIES:
            countForTarget = nation.stats.cities;
            break;
          case NationTabKey.AWARDS:
            countForTarget = nation.stats.awards.nation;
            break;
        }

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
  }, [nationId, refreshSignal]);

  useEffect(() => {
    return () => {
      setBreadcrumbs([]);
      setBackHref(null);
      setHeaderLogo(null);
      setHeaderId(undefined);
    };
  }, [setBreadcrumbs, setBackHref, setHeaderLogo, setHeaderId]);

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
        const currentCount =
          activeTab === NationTabKey.STADIUMS
              ? prev.stats.stadiums
              : activeTab === NationTabKey.CITIES
                ? prev.stats.cities
                : activeTab === NationTabKey.AWARDS
                  ? prev.stats.awards.nation
                  : 0;
        if (activeTab !== NationTabKey.DOMESTIC_COMPS && currentCount > 0) {
          return {
            ...prev,
            stats: updateNationStatsCount(prev.stats, activeTab, currentCount - 1),
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
    return !nationHub
      ? records
      : records.map((r) => ({
          ...r,
          nation: nationHub,
          nation_id: nationHub.id,
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
    const compCount = nationHub ? getNationCompetitionDisplayCount(nationHub.stats) : 0;
    const stadiumCount = nationHub?.stats?.stadiums ?? 0;
    const cityCount = nationHub?.stats?.cities ?? 0;
    const awardCount = nationHub?.stats?.awards.nation ?? 0;

    list.push({
      key: NationTabKey.INFO,
      label: (
        <div className="flex items-center gap-2">
          <TabIconBadge
            icon={<InfoCircleOutlined className={activeTab === NationTabKey.INFO ? 'text-white' : 'text-slate-600'} />}
            isActive={activeTab === NationTabKey.INFO}
          />
          <span className={activeTab === NationTabKey.INFO ? 'font-bold' : ''}>
            Info
          </span>
        </div>
      ),
    });

    if (compCount > 0) {
      list.push({
        key: NationTabKey.DOMESTIC_COMPS,
        label: (
          <div className="flex items-center gap-2" title="Competitions">
            <TabIconBadge
              icon={<DomesticCompIcon size={16} className={activeTab === NationTabKey.DOMESTIC_COMPS ? 'text-white' : 'text-amber-500'} />}
              count={compCount}
              isActive={activeTab === NationTabKey.DOMESTIC_COMPS}
            />
            <span
              className={`hidden sm:inline ${activeTab === NationTabKey.DOMESTIC_COMPS ? 'font-bold' : ''}`}
            >
              Competitions
            </span>
          </div>
        ),
      });
    }

    if (stadiumCount > 0) {
      list.push({
        key: NationTabKey.STADIUMS,
        label: (
          <div className="flex items-center gap-2" title="Stadiums">
            <TabIconBadge
              icon={<StadiumIcon size={16} className={activeTab === NationTabKey.STADIUMS ? 'text-white' : 'text-emerald-500'} />}
              count={stadiumCount}
              isActive={activeTab === NationTabKey.STADIUMS}
            />
            <span
              className={`hidden sm:inline ${activeTab === NationTabKey.STADIUMS ? 'font-bold' : ''}`}
            >
              Stadiums
            </span>
          </div>
        ),
      });
    }

    if (cityCount > 0) {
      list.push({
        key: NationTabKey.CITIES,
        label: (
          <div className="flex items-center gap-2" title="Cities">
            <TabIconBadge
              icon={<CityIcon size={16} className={activeTab === NationTabKey.CITIES ? 'text-white' : 'text-sky-500'} />}
              count={cityCount}
              isActive={activeTab === NationTabKey.CITIES}
            />
            <span
              className={`hidden sm:inline ${activeTab === NationTabKey.CITIES ? 'font-bold' : ''}`}
            >
              Cities
            </span>
          </div>
        ),
      });
    }

    if (awardCount > 0) {
      list.push({
        key: NationTabKey.AWARDS,
        label: (
          <div className="flex items-center gap-2" title="Awards">
            <TabIconBadge
              icon={<AwardIcon size={16} className={activeTab === NationTabKey.AWARDS ? 'text-white' : 'text-yellow-500'} />}
              count={awardCount}
              isActive={activeTab === NationTabKey.AWARDS}
            />
            <span
              className={`hidden sm:inline ${activeTab === NationTabKey.AWARDS ? 'font-bold' : ''}`}
            >
              Awards
            </span>
          </div>
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

  const nationShortName = nationHub?.name_sh || nationHub?.name_3l || `Nation ${nationId}`;
  const nationLongName = nationHub?.name_lg || `Nation ${nationId}`;

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
              {getNationLogoUrl(nationId, nationHub?.name_3l) ? (
                <img
                  src={getNationLogoUrl(nationId, nationHub?.name_3l)}
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
                <div className="flex items-center gap-2 w-full">
                  <Space.Compact className="flex-1 min-w-0">
                    <Input
                      placeholder="Search competitions..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onPressEnter={handleSearchSubmit}
                      allowClear
                      className="w-full text-xs"
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
                  />
                </div>
              }
            />
          )}

          {/* Tab 2: Stadiums */}
          {activeTab === NationTabKey.STADIUMS && (
            <div>
              <div className="flex items-center gap-2 mb-3 w-full">
                <Space.Compact className="flex-1 min-w-0">
                  <Input
                    placeholder="Search stadiums..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onPressEnter={handleSearchSubmit}
                    allowClear
                    className="w-full text-xs"
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
                  className="shrink-0"
                />
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
                <div className="flex items-center gap-2 w-full">
                  <Space.Compact className="flex-1 min-w-0">
                    <Input
                      placeholder="Search cities..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onPressEnter={handleSearchSubmit}
                      allowClear
                      className="w-full text-xs"
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
                    className="shrink-0"
                  />
                </div>
              }
            />
          )}

          {/* Tab 4: Awards */}
          {activeTab === NationTabKey.AWARDS && (
            <div>
              <div className="flex items-center gap-2 mb-3 w-full">
                <Space.Compact className="flex-1 min-w-0">
                  <Input
                    placeholder="Search awards..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onPressEnter={handleSearchSubmit}
                    allowClear
                    className="w-full text-xs"
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
                  className="shrink-0"
                />
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
              data={nationHub}
              type={EntityType.NATION}
              counts={{
                domesticComps: getNationCompetitionDisplayCount(nationHub.stats),
                parentComps: nationHub.stats.comps.main,
                independentClubs: nationHub.stats.club.other,
                extinctClubs: nationHub.stats.club.extinct,
                clubs: nationHub.stats.club.total,
                allClubs: nationHub.stats.club.total,
                stadiums: nationHub.stats.stadiums,
                cities: nationHub.stats.cities,
                awards: nationHub.stats.awards.nation,
                totalAwards: nationHub.stats.awards.total,
                regions: nationHub.stats.region,
              }}
              onEdit={() => openRecordModal(EntityType.NATION, nationHub)}
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
